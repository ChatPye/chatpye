import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createVideoJob, updateVideoJob, createTranscriptChunks, updateTranscriptChunkEmbeddings } from '@/lib/mongodb';
import { getYouTubeTranscript, extractVideoId, getVideoDetails } from '@/lib/youtube';
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
    await updateVideoJob(jobId, { status: 'processing', progress: 'Checking video availability...' });

    // Extract video ID
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Check video details first
    try {
      const videoDetails = await getVideoDetails(videoId);
      await updateVideoJob(jobId, { 
        progress: `Processing video: ${videoDetails.title || 'Untitled'}...` 
      });
    } catch (error) {
      console.error('Error fetching video details:', error);
      await updateVideoJob(jobId, { 
        status: 'failed',
        transcriptStatus: 'error',
        progress: 'Could not verify video details. Please check if the video is available and public.'
      });
      return;
    }

    // Update status to fetching transcript
    await updateVideoJob(jobId, { progress: 'Fetching transcript...' });

    // Fetch transcript
    const transcript = await getYouTubeTranscript(youtubeUrl);
    
    if (!transcript || transcript.length === 0) {
      // Instead of failing, mark as processed without transcript
      await updateVideoJob(jobId, { 
        status: 'completed',
        transcriptStatus: 'not_found',
        progress: 'Video processed without transcript. You can still chat about the video using Gemini.'
      });
      return;
    }

    // Update status to processing transcript
    await updateVideoJob(jobId, { progress: 'Processing transcript...' });

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
    let errorMessage = 'Error during processing';
    
    if (error instanceof Error) {
      if (error.message.includes('captions disabled')) {
        errorMessage = 'This video has captions disabled. Please try a different video with captions enabled.';
      } else if (error.message.includes('private')) {
        errorMessage = 'This video is private. Please try a public video.';
      } else if (error.message.includes('restricted')) {
        errorMessage = 'This video is restricted. Please try a different video.';
      } else if (error.message.includes('not found')) {
        errorMessage = 'Video not found. Please check the URL and try again.';
      } else {
        errorMessage = error.message;
      }
    }

    await updateVideoJob(jobId, {
      status: 'failed',
      transcriptStatus: 'error',
      progress: errorMessage
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