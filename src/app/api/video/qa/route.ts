import { NextResponse } from 'next/server'
import { /* MongoClient, ObjectId */ } from 'mongodb'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getVideoJob, getTranscriptChunks } from '@/lib/mongodb';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export async function POST(req: Request) {
  try {
    const { jobId, question } = await req.json()

    // Get job from database
    const job = await getVideoJob(jobId);

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

    // Check transcript status from the job object
    if (job.transcriptStatus !== 'found') {
      // If transcriptStatus is not 'found', it means either it's explicitly 'not_found',
      // 'processing', 'failed', 'error', or undefined.
      // In any of these cases, we cannot proceed with QA on the transcript.
      return NextResponse.json(
        { error: `Transcript is not available or not successfully processed for this video (status: ${job.transcriptStatus || 'unknown'}). Cannot answer question about its content.` },
        { status: 400 }
      );
    }

    // Fetch transcript chunks using the job's string ID
    // Note: getVideoJob returns a 'VideoJob' object which has 'jobId' (string) and '_id' (ObjectId)
    // We must use job.jobId here as getTranscriptChunks expects the string UUID.
    const transcriptChunks = await getTranscriptChunks(job.jobId);

    if (!transcriptChunks || transcriptChunks.length === 0) {
      // This case should ideally not be reached if job.transcriptStatus is 'found',
      // but it's a good safeguard.
      return NextResponse.json(
        { error: 'Transcript chunks not found for this job, even though job status indicated they should exist.' },
        { status: 404 } // Or 500 if this implies an internal inconsistency
      );
    }

    // Combine transcript segments into a single text
    const fullTranscript = transcriptChunks.map(chunk => chunk.textContent).join(' ');

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