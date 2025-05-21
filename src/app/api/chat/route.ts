import { NextResponse } from "next/server"
import { getTranscriptChunks } from "@/lib/mongodb"
import { findRelevantChunks } from "@/lib/embeddings"
import { openAIService } from '@/lib/openai';
import { anthropicService } from '@/lib/anthropic';
import { geminiService } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { message, jobId, modelId } = await request.json()

    if (!message || !jobId || !modelId) {
      return NextResponse.json(
        { error: "Message, jobId, and modelId are required" },
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

    // Get all transcript chunks for the video
    const chunks = await getTranscriptChunks(jobId)
    
    if (!chunks || chunks.length === 0) {
      return NextResponse.json(
        { error: "No transcript chunks found for this video" },
        { status: 404 }
      )
    }

    // Find relevant chunks using semantic search
    const relevantChunks = await findRelevantChunks(message, chunks)

    // Prepare context for the services
    const serviceContext = relevantChunks.map(chunk => ({
      text: chunk.textContent,
      startTimestamp: String(chunk.startTimestamp),
      endTimestamp: String(chunk.endTimestamp)
    }));

    let text = "";

    if (modelId === "gemini") {
      text = await geminiService.generateAnswer(serviceContext, message);
    } else if (modelId === "openai") {
      text = await openAIService.generateAnswer(serviceContext, message);
    } else if (modelId === "anthropic") {
      text = await anthropicService.generateAnswer(serviceContext, message);
    }
    // No need for a default case here for unknown modelId because it's handled by the `supportedModels.includes` check earlier.

    return NextResponse.json({ message: text })
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    )
  }
} 