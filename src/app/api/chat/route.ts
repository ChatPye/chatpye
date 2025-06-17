import { NextResponse } from "next/server"
import { getTranscriptChunks, getVideoJob, getCachedQAResponse, saveQAResponse, getTranscriptChunksByVideoId, verifyTranscriptVideoId } from "@/lib/mongodb"
import { findRelevantChunks } from "@/lib/embeddings"
import { openAIService } from '@/lib/openai';
import { anthropicService } from '@/lib/anthropic';
import { geminiService } from '@/lib/gemini';
import { getEnvVar } from '@/lib/env';
import { extractVideoId } from '@/lib/youtube';

interface ServiceContext {
  text: string;
  startTimestamp: string;
  endTimestamp: string;
  jobId: string;
  videoId: string;
}

// Add this interface at the top level
interface TranscriptChunk {
  jobId: string;
  userId: string;
  chunkId: string;
  textContent: string;
  startTimestamp: string;
  endTimestamp: string;
  segmentCount: number;
  embedding: number[];
  metadata: {
    processingVersion: number;
    videoId: string;
    originalJobId?: string;
  };
}

// Helper to normalize questions for consistent cache keys
function normalizeQuestion(question: string): string {
  return question.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Utility to convert AsyncIterable<string> to ReadableStream<Uint8Array>
// and call an onComplete callback with the accumulated text.
async function processStreamForResponseAndCache(
  streamGenerator: AsyncGenerator<string>, 
  onComplete: (fullText: string) => Promise<void> 
): Promise<ReadableStream<Uint8Array>> {
  let accumulatedText = "";
  const encoder = new TextEncoder();
  let streamClosed = false; // Flag to prevent multiple onComplete calls

  const readableStream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await streamGenerator.next();
        if (done) {
          if (!streamClosed) {
            streamClosed = true;
            controller.close();
            // Call onComplete asynchronously without blocking stream closure
            onComplete(accumulatedText).catch(cacheError => {
              console.error("Error saving to cache post-stream:", cacheError);
            });
          }
        } else {
          accumulatedText += value;
          controller.enqueue(encoder.encode(value));
        }
      } catch (error) {
        console.error("Error in stream generator during pull:", error);
        if (!streamClosed) { // Only act if stream hasn't been closed/errored
          streamClosed = true;
          controller.error(error); // Propagate error to the stream consumer
        }
      }
    },
    async cancel(reason) { // Added async for potential await in generator.return
      console.log("Stream cancelled by client:", reason);
      if (!streamClosed) {
        streamClosed = true;
        if (typeof streamGenerator.return === 'function') {
          try {
            await streamGenerator.return(undefined); // Ensure generator cleanup
          } catch (genError) {
            console.error("Error during generator return on cancel:", genError);
          }
        }
      }
    }
  });
  return readableStream;
}

// Add this function at the top level
async function validateTranscriptChunks(chunks: TranscriptChunk[], videoId: string, userId: string) {
  if (!chunks || chunks.length === 0) {
    console.log('No transcript chunks found for video:', videoId);
    throw new Error('No transcript chunks found');
  }

  // Verify all chunks belong to the correct video
  const invalidChunks = chunks.filter(chunk => 
    chunk.metadata?.videoId !== videoId
  );

  if (invalidChunks.length > 0) {
    console.error('Found transcript chunks with mismatched videoId:', {
      expectedVideoId: videoId,
      invalidChunks: invalidChunks.map(c => ({
        jobId: c.jobId,
        actualVideoId: c.metadata?.videoId
      }))
    });
    throw new Error('Found transcript chunks with mismatched video ID');
  }

  // Verify all chunks belong to the correct user
  const unauthorizedChunks = chunks.filter(chunk => 
    chunk.userId !== userId
  );

  if (unauthorizedChunks.length > 0) {
    console.error('Found transcript chunks with mismatched userId:', {
      expectedUserId: userId,
      unauthorizedChunks: unauthorizedChunks.map(c => ({
        jobId: c.jobId,
        actualUserId: c.userId
      }))
    });
    throw new Error('Found transcript chunks with mismatched user ID');
  }

  // Verify timestamp continuity
  const sortedChunks = [...chunks].sort((a, b) => 
    parseFloat(a.startTimestamp) - parseFloat(b.startTimestamp)
  );

  for (let i = 1; i < sortedChunks.length; i++) {
    const prevEnd = parseFloat(sortedChunks[i-1].endTimestamp);
    const currStart = parseFloat(sortedChunks[i].startTimestamp);
    
    if (currStart < prevEnd) {
      console.error('Found overlapping timestamps:', {
        previous: {
          jobId: sortedChunks[i-1].jobId,
          end: prevEnd
        },
        current: {
          jobId: sortedChunks[i].jobId,
          start: currStart
        }
      });
      throw new Error('Transcript chunks contain overlapping timestamps');
    }
  }

  return sortedChunks;
}

export async function POST(request: Request) {
  try {
    const { message, jobId: providedJobId, modelId, videoId: youtubeVideoIdFromRequest, videoTitle, videoDescription } = await request.json();

    if (!message || !modelId) {
      return NextResponse.json({ error: "Message and modelId are required" }, { status: 400 });
    }

    // For RAG and caching, we need a canonical jobId (UUID)
    let canonicalJobId = providedJobId;
    let actualYoutubeVideoId = youtubeVideoIdFromRequest;

    // If no jobId provided but we have a videoId, try to resolve the canonical jobId
    if (!canonicalJobId && youtubeVideoIdFromRequest) {
      try {
        const resolveResponse = await fetch(`${request.headers.get('origin')}/api/video/resolve-job?youtubeVideoId=${youtubeVideoIdFromRequest}`);
        if (resolveResponse.ok) {
          const { jobId } = await resolveResponse.json();
          canonicalJobId = jobId;
        }
      } catch (error) {
        console.error('Error resolving jobId:', error);
      }
    }

    // For OpenAI/Anthropic, we absolutely need a jobId
    if (!canonicalJobId && modelId !== 'gemini') {
      return NextResponse.json({ error: "jobId (canonical UUID) is required for this model." }, { status: 400 });
    }

    // For Gemini, we need either a jobId or a videoId
    if (!canonicalJobId && modelId === 'gemini' && !youtubeVideoIdFromRequest) {
      return NextResponse.json({ error: "For Gemini, either jobId (UUID) or videoId (YouTube ID) is required." }, { status: 400 });
    }

    const supportedModels = ["gemini", "openai", "anthropic"];
    if (!supportedModels.includes(modelId)) {
      return NextResponse.json({ error: `Invalid modelId. Supported models: ${supportedModels.join(", ")}` }, { status: 400 });
    }

    const normalizedQuestion = normalizeQuestion(message);
    let modelUsedForCacheKey: string;

    if (modelId === "gemini") {
      modelUsedForCacheKey = "gemini-1.5-pro";
      
      // Use the canonical jobId for caching if available
      if (canonicalJobId) {
        const cachedResponse = await getCachedQAResponse(canonicalJobId, normalizedQuestion, modelUsedForCacheKey);
        if (cachedResponse) {
          console.log(`CACHE_HIT: Gemini - JobId: ${canonicalJobId}, Question: "${normalizedQuestion}"`);
          return NextResponse.json({ message: cachedResponse.responseText, fromCache: true, stream: false });
        }
        console.log(`CACHE_MISS: Gemini - JobId: ${canonicalJobId}, Question: "${normalizedQuestion}"`);
      } else {
        console.log(`CACHE_SKIP: No jobId (UUID) provided, skipping cache lookup for Gemini. Question: "${normalizedQuestion}"`);
      }

      let serviceContext: ServiceContext[] = [];
      if (canonicalJobId) {
        const chunks = await getTranscriptChunks(canonicalJobId);
        if (chunks && chunks.length > 0) {
          const relevantChunks = await findRelevantChunks(message, chunks);
          serviceContext = relevantChunks.map(chunk => ({
            text: chunk.textContent,
            startTimestamp: chunk.startTimestamp.toString(),
            endTimestamp: chunk.endTimestamp.toString(),
            jobId: canonicalJobId,
            videoId: actualYoutubeVideoId || ''
          }));
        }
      }

      // If we don't have a videoId but have a jobId, try to get it from the job
      if (!actualYoutubeVideoId && canonicalJobId) {
        const jobDetails = await getVideoJob(canonicalJobId);
        if (jobDetails?.processingMetadata?.videoId) {
          actualYoutubeVideoId = jobDetails.processingMetadata.videoId;
          // Update videoId in serviceContext if we found it
          serviceContext = serviceContext.map(ctx => ({
            ...ctx,
            videoId: actualYoutubeVideoId
          }));
        }
      }

      // If no transcript chunks found, fall back to direct YouTube URL approach
      if (serviceContext.length === 0 && !actualYoutubeVideoId) {
          return NextResponse.json({ error: "Cannot generate answer without transcript or videoId." }, { status: 400 });
      }

      const geminiGenerator = geminiService.generateAnswerStream(
        serviceContext,
        message,
        actualYoutubeVideoId || '',
        videoTitle,
        videoDescription
      );
      
      const stream = await processStreamForResponseAndCache(
        geminiGenerator,
        async (fullText) => {
          if (canonicalJobId) {
            await saveQAResponse(canonicalJobId, normalizedQuestion, fullText, modelUsedForCacheKey);
            console.log(`CACHE_SAVE: Gemini - JobId: ${canonicalJobId}, Question: "${normalizedQuestion}"`);
          }
        }
      );
      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "no-cache",
        },
      });

    } else if (modelId === "openai") {
      // Logic for OpenAI
      if (!canonicalJobId) {
        return NextResponse.json({ error: "jobId is required for OpenAI model." }, { status: 400 });
      }
      const chunks = await getTranscriptChunks(canonicalJobId);
      if (!chunks || chunks.length === 0) {
        return NextResponse.json({ error: "No transcript chunks found for this video.", stream: false, fromCache: false }, { status: 404 });
      }

      const relevantChunks = await findRelevantChunks(message, chunks);
      const serviceContextFromChunks = relevantChunks.map(chunk => ({
        text: chunk.textContent,
        startTimestamp: chunk.startTimestamp.toString(),
        endTimestamp: chunk.endTimestamp.toString(),
      }));

      if (!serviceContextFromChunks || serviceContextFromChunks.length === 0) {
        return NextResponse.json({ error: "Could not derive relevant context from the video transcript." }, { status: 404 });
      }

      let text = "";
      modelUsedForCacheKey = "openai-gpt-3.5-turbo";
      text = await openAIService.generateAnswer(serviceContextFromChunks, message);

      // Cache the response
      await saveQAResponse(canonicalJobId, normalizedQuestion, modelUsedForCacheKey, text);
      
      return NextResponse.json({ message: text, fromCache: false, stream: false });
    } else {
      // Logic for Anthropic
      if (!canonicalJobId) {
        return NextResponse.json({ error: "jobId is required for Anthropic model." }, { status: 400 });
      }
      const chunks = await getTranscriptChunks(canonicalJobId);
      if (!chunks || chunks.length === 0) {
        return NextResponse.json({ error: "No transcript chunks found for this video.", stream: false, fromCache: false }, { status: 404 });
      }

      const relevantChunks = await findRelevantChunks(message, chunks);
      const serviceContextFromChunks = relevantChunks.map(chunk => ({
        text: chunk.textContent,
        startTimestamp: chunk.startTimestamp.toString(),
        endTimestamp: chunk.endTimestamp.toString(),
      }));

      if (!serviceContextFromChunks || serviceContextFromChunks.length === 0) {
        return NextResponse.json({ error: "Could not derive relevant context from the video transcript." }, { status: 404 });
      }

      let text = "";
      modelUsedForCacheKey = "anthropic-claude-3-opus";
      text = await anthropicService.generateAnswer(serviceContextFromChunks, message);

      // Cache the response
      await saveQAResponse(canonicalJobId, normalizedQuestion, modelUsedForCacheKey, text);
      
      return NextResponse.json({ message: text, fromCache: false, stream: false });
    }

  } catch (error: any) {
    console.error("General error in /api/chat POST:", error.message, error.stack);
    return NextResponse.json(
      { error: "Failed to generate response due to an unexpected internal server error.", errorMessage: error.message },
      { status: 500 }
    );
  }
} 