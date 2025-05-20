import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createVideoJob, updateVideoJob, createTranscriptChunks, updateTranscriptChunkEmbeddings } from '@/lib/mongodb';
import { getYouTubeTranscript } from '@/lib/youtube';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateEmbedding } from '@/lib/embeddings';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '');

async function processVideo(jobId: string, youtubeUrl: string) {
  try {
    // Update job status to processing
    await updateVideoJob(jobId, { status: 'processing' });

    // Fetch transcript
    const transcript = await getYouTubeTranscript(youtubeUrl);
    
    if (!transcript || transcript.length === 0) {
      await updateVideoJob(jobId, { 
        status: 'failed',
        transcriptStatus: 'not_found'
      });
      return;
    }

    // Create transcript chunks
    const chunks = transcript.map((segment, index) => ({
      jobId,
      chunkId: `${jobId}-${index}`,
      textContent: segment.text,
      startTimestamp: segment.start.toString(),
      endTimestamp: (segment.start + segment.duration).toString(),
      embedding: [] // Will be populated below
    }));

    // Only insert chunks if we have valid data
    if (chunks.length > 0) {
      // Store transcript chunks
      await createTranscriptChunks(chunks);

      // Generate embeddings for each chunk
      for (const chunk of chunks) {
        try {
          const embedding = await generateEmbedding(chunk.textContent);
          await updateTranscriptChunkEmbeddings(jobId, chunk.chunkId, embedding);
        } catch (error) {
          console.error(`Error generating embedding for chunk ${chunk.chunkId}:`, error);
          // Continue with other chunks even if one fails
        }
      }

      // Update job status
      await updateVideoJob(jobId, {
        status: 'completed',
        transcriptStatus: 'found'
      });
    } else {
      await updateVideoJob(jobId, {
        status: 'failed',
        transcriptStatus: 'not_found'
      });
    }
  } catch (error) {
    console.error('Error processing video:', error);
    await updateVideoJob(jobId, {
      status: 'failed',
      transcriptStatus: 'not_found'
    });
  }
}

export async function POST(request: Request) {
  try {
    const { youtubeUrl } = await request.json();
    
    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Generate a unique job ID
    const jobId = uuidv4();

    // Create initial job record
    const job = await createVideoJob({
      jobId,
      youtubeUrl,
      status: 'pending',
      transcriptStatus: 'processing'
    });

    // Start processing in the background
    processVideo(jobId, youtubeUrl).catch(console.error);

    return NextResponse.json({
      status: 'success',
      message: 'Video processing started',
      jobId
    });
  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      { error: 'Failed to process video' },
      { status: 500 }
    );
  }
} 