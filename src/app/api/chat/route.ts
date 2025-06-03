import { NextResponse } from "next/server"
import { getTranscriptChunks, getVideoJob, getCachedQAResponse, saveQAResponse } from "@/lib/mongodb"
import { findRelevantChunks } from "@/lib/embeddings"
import { openAIService } from '@/lib/openai';
import { anthropicService } from '@/lib/anthropic';
import { geminiService } from '@/lib/gemini';

interface ServiceContext {
  text: string;
  startTimestamp: string;
  endTimestamp: string;
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

export async function POST(request: Request) {
  try {
    const { message, jobId, modelId, videoId } = await request.json()

    if (!message || !modelId) {
      return NextResponse.json(
        { error: "Message and modelId are required", stream: false, fromCache: false },
        { status: 400 }
      )
    }

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

    const normalizedQuestion = normalizeQuestion(message);
    // Define model used for cache key based on actual model being used by the service
    // This might need to be more dynamic if model versions change in services
    let modelUsedForCacheKey: string;

    // --- Gemini Model Path (Defaulting to Direct YouTube URL Streaming with Cache) ---
    if (modelId === "gemini") {
      modelUsedForCacheKey = "gemini-1.5-pro"; // Updated cache key
      
      // 1. Check Cache First
      const cachedResponse = await getCachedQAResponse(jobId, normalizedQuestion, modelUsedForCacheKey);
      if (cachedResponse) {
        console.log(`CACHE_HIT: Gemini - JobId: ${jobId}, Question: "${normalizedQuestion}"`);
        return NextResponse.json({ 
          message: cachedResponse.responseText, 
          fromCache: true, 
          stream: false 
        });
      }
      console.log(`CACHE_MISS: Gemini - JobId: ${jobId}, Question: "${normalizedQuestion}"`);

      // 2. Get transcript chunks for RAG-based approach
      const chunks = await getTranscriptChunks(jobId);
      let serviceContext: ServiceContext[] = [];

      if (chunks && chunks.length > 0) {
        // If we have chunks, use RAG
        const relevantChunks = await findRelevantChunks(message, chunks);
        serviceContext = relevantChunks.map(chunk => ({
          text: chunk.textContent,
          startTimestamp: chunk.startTimestamp.toString(),
          endTimestamp: chunk.endTimestamp.toString(),
        }));
      }

      // 3. Generate answer using Gemini
      const geminiGenerator = geminiService.generateAnswer(
        serviceContext,
        message,
        jobId
      );

      // Collect the response from the generator
      let geminiResponse = '';
      for await (const chunk of geminiGenerator) {
        geminiResponse += chunk;
      }

      // 4. Cache the response
      await saveQAResponse(jobId, normalizedQuestion, modelUsedForCacheKey, geminiResponse);

      return NextResponse.json({ 
        message: geminiResponse, 
        fromCache: false, 
        stream: false 
      });
    } 
    // --- OpenAI / Anthropic Models Path (RAG-based, Non-Streaming for now) ---
    // These paths will require transcript chunks (serviceContext)
    else { 
        const chunks = await getTranscriptChunks(jobId);
        if (!chunks || chunks.length === 0) {
            return NextResponse.json(
                { error: "No transcript chunks found for this video to use with selected model.", stream: false, fromCache: false },
                { status: 404 }
            );
        }
        const relevantChunks = await findRelevantChunks(message, chunks);
        const serviceContext = relevantChunks.map(chunk => ({
            text: chunk.textContent,
            startTimestamp: chunk.startTimestamp.toString(), // Ensure string format for services
            endTimestamp: chunk.endTimestamp.toString(),     // Ensure string format for services
        }));

        if (!serviceContext || serviceContext.length === 0) {
             return NextResponse.json(
                { error: "Could not derive relevant context for this question from the video transcript." },
                { status: 404 }
            );
        }

        let text = "";
        if (modelId === "openai") {
            modelUsedForCacheKey = "openai-gpt-3.5-turbo"; // Example
            // TODO: Implement caching for OpenAI if desired, following similar pattern as Gemini
            text = await openAIService.generateAnswer(serviceContext, message);
        } else if (modelId === "anthropic") {
            modelUsedForCacheKey = "anthropic-claude-3-opus"; // Example
            // TODO: Implement caching for Anthropic if desired
            text = await anthropicService.generateAnswer(serviceContext, message);
        } else {
            return NextResponse.json({ error: "Invalid modelId provided." }, { status: 400 });
        }
        
        // For now, OpenAI and Anthropic are non-streaming and don't use the new cache write path.
        // If they were to be cached, the saveQAResponse would be called here.
        return NextResponse.json({ message: text, fromCache: false, stream: false });
    }

  } catch (error: any) {
    console.error("General error in /api/chat POST:", error.message, error.stack);
    // Ensure a JSON response for errors not caught by specific blocks
    return NextResponse.json(
      { error: "Failed to generate response due to an unexpected internal server error.", errorMessage: error.message, stream: false, fromCache: false },
      { status: 500 }
    );
  }
} 