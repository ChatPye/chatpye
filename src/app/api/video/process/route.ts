import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createVideoJob, updateVideoJob, createTranscriptChunks, updateTranscriptChunkEmbeddings } from '@/lib/mongodb';
import { getYouTubeTranscript } from '@/lib/youtube';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateEmbedding } from '@/lib/embeddings';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '');

// Process chunks in batches to avoid memory issues
async function processChunksInBatches(chunks: any[], jobId: string, batchSize = 5) {
  const totalChunks = chunks.length;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    await updateVideoJob(jobId, { 
      progress: `Processing chunks ${i + 1}-${Math.min(i + batchSize, totalChunks)} of ${totalChunks}...` 
    });

    // Process batch in parallel
    await Promise.all(batch.map(async (chunk) => {
      try {
        const embedding = await generateEmbedding(chunk.textContent);
        await updateTranscriptChunkEmbeddings(jobId, chunk.chunkId, embedding);
      } catch (error) {
        console.error(`Error processing chunk ${chunk.chunkId}:`, error);
        // Continue with other chunks even if one fails
      }
    }));
  }
}

async function processVideo(jobId: string, youtubeUrl: string) {
  try {
    // Update job status to processing
    await updateVideoJob(jobId, { status: 'processing', progress: 'Fetching transcript...' });

    // Fetch transcript
    const transcript = await getYouTubeTranscript(youtubeUrl);
    
    if (!transcript || transcript.length === 0) {
      await updateVideoJob(jobId, { 
        status: 'failed',
        transcriptStatus: 'not_found',
        progress: 'No transcript found'
      });
      return;
    }

    // Create transcript chunks with a maximum size
    const MAX_CHUNK_SIZE = 1000; // characters
    const chunks = [];
    let currentChunk = {
      text: '',
      start: 0,
      duration: 0
    };

    for (const segment of transcript) {
      if (currentChunk.text.length + segment.text.length > MAX_CHUNK_SIZE) {
        // Save current chunk if it has content
        if (currentChunk.text) {
          chunks.push({
            jobId,
            chunkId: `${jobId}-${chunks.length}`,
            textContent: currentChunk.text.trim(),
            startTimestamp: currentChunk.start.toString(),
            endTimestamp: (currentChunk.start + currentChunk.duration).toString(),
            embedding: []
          });
        }
        // Start new chunk
        currentChunk = {
          text: segment.text,
          start: segment.start,
          duration: segment.duration
        };
      } else {
        // Add to current chunk
        currentChunk.text += ' ' + segment.text;
        currentChunk.duration += segment.duration;
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.text) {
      chunks.push({
        jobId,
        chunkId: `${jobId}-${chunks.length}`,
        textContent: currentChunk.text.trim(),
        startTimestamp: currentChunk.start.toString(),
        endTimestamp: (currentChunk.start + currentChunk.duration).toString(),
        embedding: []
      });
    }

    // Only process if we have valid chunks
    if (chunks.length > 0) {
      // Store transcript chunks
      await updateVideoJob(jobId, { progress: 'Storing transcript chunks...' });
      await createTranscriptChunks(chunks);

      // Process chunks in batches
      await processChunksInBatches(chunks, jobId);

      // Update job status
      await updateVideoJob(jobId, {
        status: 'completed',
        transcriptStatus: 'found',
        progress: 'Processing complete'
      });
    } else {
      await updateVideoJob(jobId, {
        status: 'failed',
        transcriptStatus: 'not_found',
        progress: 'No valid transcript chunks found'
      });
    }
  } catch (error) {
    console.error('Error processing video:', error);
    await updateVideoJob(jobId, {
      status: 'failed',
      transcriptStatus: 'error',
      progress: error instanceof Error ? error.message : 'Error during processing'
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
      transcriptStatus: 'processing',
      progress: 'Starting processing...'
    });

    // Start processing in the background
    processVideo(jobId, youtubeUrl).catch(error => {
      console.error('Background processing error:', error);
    });

    return NextResponse.json({
      status: 'success',
      message: 'Video processing started',
      jobId
    });
  } catch (error) {
    console.error('Error in POST endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 