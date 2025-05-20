import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { getTranscriptChunks } from "@/lib/mongodb"
import { findRelevantChunks } from "@/lib/embeddings"

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export async function POST(request: Request) {
  try {
    const { message, jobId } = await request.json()

    if (!message || !jobId) {
      return NextResponse.json(
        { error: "Message and jobId are required" },
        { status: 400 }
      )
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

    // Prepare context from relevant chunks
    const context = relevantChunks.map(chunk => 
      `[${chunk.startTimestamp}s - ${chunk.endTimestamp}s] ${chunk.textContent}`
    ).join('\n')

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

    // Create prompt with context and user question
    const prompt = `You are a helpful assistant that answers questions about a video based on its transcript. 
    Use the following transcript segments to answer the question. Include relevant timestamps in your response.
    
    Transcript segments:
    ${context}
    
    Question: ${message}
    
    Please provide a clear and concise answer, referencing specific timestamps when relevant.`

    // Generate response
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ message: text })
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    )
  }
} 