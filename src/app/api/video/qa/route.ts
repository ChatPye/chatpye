import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getVideoJob, getTranscriptChunks } from '@/lib/mongodb';
import { getEnvVar } from '@/lib/env';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(getEnvVar('GOOGLE_AI_KEY'))

export async function POST(req: Request) {
  try {
    const { jobId, question, videoId } = await req.json()

    if (!jobId || !videoId) {
      return NextResponse.json(
        { error: 'Job ID and Video ID are required' },
        { status: 400 }
      )
    }

    // Get job from database
    const job = await getVideoJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Verify that the job's videoId matches the requested videoId
    if (job.processingMetadata?.videoId !== videoId) {
      return NextResponse.json(
        { error: 'Video ID mismatch: The requested video does not match the job' },
        { status: 400 }
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
      return NextResponse.json(
        { error: `Transcript is not available or not successfully processed for this video (status: ${job.transcriptStatus || 'unknown'}). Cannot answer question about its content.` },
        { status: 400 } 
      );
    }

    // Fetch transcript chunks using the job's string ID
    const transcriptChunks = await getTranscriptChunks(job.jobId); 

    if (!transcriptChunks || transcriptChunks.length === 0) {
      return NextResponse.json(
        { error: 'Transcript chunks not found for this job, even though job status indicated they should exist.' },
        { status: 404 }
      );
    }

    // Verify that all chunks belong to the correct video
    const invalidChunks = transcriptChunks.filter(chunk => 
      chunk.metadata?.videoId !== videoId
    );

    if (invalidChunks.length > 0) {
      console.error('Found transcript chunks with mismatched videoId:', {
        expectedVideoId: videoId,
        invalidChunks: invalidChunks.map(c => ({
          chunkId: c.chunkId,
          actualVideoId: c.metadata?.videoId
        }))
      });
      return NextResponse.json(
        { error: 'Internal error: Found transcript chunks with mismatched video ID' },
        { status: 500 }
      );
    }

    // Combine transcript segments into a single text with timestamps
    const fullTranscript = transcriptChunks
      .map(chunk => `[${chunk.startTimestamp}s - ${chunk.endTimestamp}s] ${chunk.textContent}`)
      .join('\n\n');

    // Generate answer using Google AI with explicit videoId context
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    const result = await model.generateContent(
      `You are answering questions about a YouTube video with ID: ${videoId}\n\n` +
      `Based on the following video transcript, please answer this question: ${question}\n\n` +
      `Transcript:\n${fullTranscript}\n\n` +
      `Remember to only use information from this specific video's transcript.`
    )
    const answer = result.response.text()

    return NextResponse.json({ 
      answer,
      metadata: {
        videoId,
        jobId,
        transcriptChunkCount: transcriptChunks.length,
        timestampRange: {
          start: transcriptChunks[0].startTimestamp,
          end: transcriptChunks[transcriptChunks.length - 1].endTimestamp
        }
      }
    })
  } catch (error) {
    console.error('Error getting answer:', error)
    return NextResponse.json(
      { error: 'Failed to get answer' },
      { status: 500 }
    )
  }
} 