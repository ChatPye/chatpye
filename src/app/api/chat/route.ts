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
    const { messages, videoId, userId } = await request.json();
    
    if (!videoId || !userId) {
      return NextResponse.json(
        { error: 'Video ID and User ID are required' },
        { status: 400 }
      );
    }

    // Get the latest message
    const latestMessage = messages[messages.length - 1];
    const { message, jobId, modelId } = latestMessage;

    if (!message || !modelId) {
      return NextResponse.json(
        { error: 'Message and model ID are required' },
        { status: 400 }
      );
    }

    // Normalize the question for caching
    const normalizedQuestion = message.toLowerCase().trim();
    let modelUsedForCacheKey = modelId;

    // 1. Check cache first
    const cachedResponse = await getCachedQAResponse(jobId, normalizedQuestion, modelUsedForCacheKey);
    if (cachedResponse) {
      console.log('CACHE_HIT:', { jobId, question: normalizedQuestion, model: modelUsedForCacheKey });
      return new NextResponse(cachedResponse.responseText, {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    console.log('CACHE_MISS:', { jobId, question: normalizedQuestion, model: modelUsedForCacheKey });

    // For non-Gemini models, jobId is required
    if (modelId !== "gemini" && !jobId) {
      return NextResponse.json(
        { error: "jobId is required for non-Gemini models", stream: false, fromCache: false },
        { status: 400 }
      )
    }

    // For Gemini model, either jobId or videoId is required
    if (modelId === "gemini" && !jobId && !videoId) {
      return NextResponse.json(
        { error: "Either jobId or videoId is required for Gemini model", stream: false, fromCache: false },
        { status: 400 }
      )
    }

    const supportedModels = ["gemini", "openai", "anthropic"];
    if (!supportedModels.includes(modelId)) {
      return NextResponse.json(
        { error: `Invalid modelId. Supported models are: ${supportedModels.join(", ")}` },
        { status: 400 }
      );
    }

    // --- Gemini Model Path (Defaulting to Direct YouTube URL Streaming with Cache) ---
    if (modelId === "gemini") {
      modelUsedForCacheKey = "gemini-1.5-pro"; // Updated cache key
      
      // 2. Get transcript chunks for RAG-based approach
      let chunks: TranscriptChunk[] = [];
      try {
        chunks = await getTranscriptChunksByVideoId(videoId, userId);
        console.log(`Found ${chunks.length} transcript chunks for video ${videoId}`);
      } catch (error) {
        console.error('Error fetching transcript chunks:', error);
        chunks = [];
      }
      
      try {
        // Validate chunks before using them
        const validChunks = await validateTranscriptChunks(chunks, videoId, userId);
        
        if (validChunks.length === 0) {
          console.log('No valid chunks found for this video, falling back to direct YouTube URL approach');
          // If no valid chunks, use direct YouTube URL approach
          const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
          const geminiGenerator = geminiService.generateAnswerFromYouTubeUrlDirectly(youtubeUrl, message);
          const stream = await processStreamForResponseAndCache(
            geminiGenerator,
            async (fullText) => {
              await saveQAResponse(jobId, normalizedQuestion, modelUsedForCacheKey, fullText);
            }
          );

          return new NextResponse(stream, {
            headers: {
              'Content-Type': 'text/plain',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }

        // Find relevant chunks from validated chunks
        const relevantChunks = await findRelevantChunks(message, validChunks);
        
        if (relevantChunks.length === 0) {
          console.log('No relevant chunks found, falling back to direct YouTube URL approach');
          const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
          const geminiGenerator = geminiService.generateAnswerFromYouTubeUrlDirectly(youtubeUrl, message);
          const stream = await processStreamForResponseAndCache(
            geminiGenerator,
            async (fullText) => {
              await saveQAResponse(jobId, normalizedQuestion, modelUsedForCacheKey, fullText);
            }
          );

          return new NextResponse(stream, {
            headers: {
              'Content-Type': 'text/plain',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }

        const serviceContext = relevantChunks.map(chunk => ({
          text: chunk.textContent,
          startTimestamp: chunk.startTimestamp.toString(),
          endTimestamp: chunk.endTimestamp.toString(),
          jobId: chunk.jobId,
          videoId: chunk.metadata.videoId
        }));

        // Generate answer using RAG
        const geminiGenerator = geminiService.generateAnswerStream(serviceContext);
        const stream = await processStreamForResponseAndCache(
          geminiGenerator,
          async (fullText) => {
            await saveQAResponse(jobId, normalizedQuestion, modelUsedForCacheKey, fullText);
          }
        );

        return new NextResponse(stream, {
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } catch (error) {
        console.error('Error validating or processing transcript chunks:', error);
        // Fall back to direct YouTube URL approach
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const geminiGenerator = geminiService.generateAnswerFromYouTubeUrlDirectly(youtubeUrl, message);
        const stream = await processStreamForResponseAndCache(
          geminiGenerator,
          async (fullText) => {
            await saveQAResponse(jobId, normalizedQuestion, modelUsedForCacheKey, fullText);
          }
        );

        return new NextResponse(stream, {
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }
    }
    // --- OpenAI / Anthropic Models Path (RAG-based, Non-Streaming for now) ---
    else { 
      const chunks = await getTranscriptChunks(jobId);
      
      try {
        // Validate chunks before using them
        const validChunks = await validateTranscriptChunks(chunks, videoId, userId);
        
        if (validChunks.length === 0) {
          return NextResponse.json(
            { error: "No valid transcript chunks found for this video to use with selected model.", stream: false, fromCache: false },
            { status: 404 }
          );
        }

        const relevantChunks = await findRelevantChunks(message, validChunks);
        if (relevantChunks.length === 0) {
          return NextResponse.json(
            { error: "Could not derive relevant context for this question from the video transcript." },
            { status: 404 }
          );
        }

        const serviceContext = relevantChunks.map(chunk => ({
          text: chunk.textContent,
          startTimestamp: chunk.startTimestamp.toString(),
          endTimestamp: chunk.endTimestamp.toString(),
          jobId: jobId,
          videoId: chunk.metadata.videoId
        }));

        let text = "";
        if (modelId === "openai") {
          modelUsedForCacheKey = "openai-gpt-3.5-turbo";
          text = await openAIService.generateAnswer(serviceContext, message);
        } else if (modelId === "anthropic") {
          modelUsedForCacheKey = "anthropic-claude-3-opus";
          text = await anthropicService.generateAnswer(serviceContext, message);
        }

        // Save to cache
        await saveQAResponse(jobId, normalizedQuestion, modelUsedForCacheKey, text);
        
        return NextResponse.json({ message: text, fromCache: false, stream: false });
      } catch (error) {
        console.error('Error validating or processing transcript chunks:', error);
        return NextResponse.json(
          { error: "Failed to process transcript chunks. Please try again later." },
          { status: 500 }
        );
      }
    }
  } catch (error: any) {
    console.error("General error in /api/chat POST:", error.message, error.stack);
    return NextResponse.json(
      { error: "Failed to generate response due to an unexpected internal server error.", errorMessage: error.message, stream: false, fromCache: false },
      { status: 500 }
    );
  }
} 