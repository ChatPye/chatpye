import { NextResponse } from 'next/server'
import { MongoClient, ObjectId } from 'mongodb'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize MongoDB client
const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017')
const db = client.db('chatpye')

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export async function POST(req: Request) {
  try {
    const { jobId, question } = await req.json()

    // Get job from database
    const job = await db.collection('jobs').findOne({
      _id: new ObjectId(jobId)
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Video processing not completed' },
        { status: 400 }
      )
    }

    // Combine transcript segments into a single text
    const fullTranscript = job.transcript.map((segment: any) => segment.text).join(' ')

    // Generate answer using Google AI
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    const result = await model.generateContent(
      `Based on the following video transcript, please answer this question: ${question}\n\nTranscript:\n${fullTranscript}`
    )
    const answer = result.response.text()

    return NextResponse.json({ answer })
  } catch (error) {
    console.error('Error getting answer:', error)
    return NextResponse.json(
      { error: 'Failed to get answer' },
      { status: 500 }
    )
  }
} 