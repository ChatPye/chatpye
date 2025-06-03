import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createVideoJob, updateVideoJob, createTranscriptChunks, updateTranscriptChunkEmbeddings } from '@/lib/mongodb';
import { getYouTubeTranscript, extractVideoId, getVideoDetails } from '@/lib/youtube';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateEmbedding } from '@/lib/embeddings';
import { getCollections } from '@/lib/mongodb';

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

    // Try to fetch transcript, but don't fail if it's not available
    let transcript = null;
    try {
      transcript = await getYouTubeTranscript(youtubeUrl);
    } catch (error) {
      console.log('No transcript available, will use Gemini directly:', error);
      // Continue processing without transcript
    }

    if (!transcript || transcript.length === 0) {
      // Mark as completed without transcript - we'll use Gemini directly
      await updateVideoJob(jobId, { 
        status: 'completed',
        transcriptStatus: 'not_found',
        progress: 'Video processed. You can now chat about the video using Gemini.'
      });
      return;
    }

    // If we have a transcript, process it
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

    // Only process chunks if we have them
    if (chunks.length > 0) {
      // Store transcript chunks
      await updateVideoJob(jobId, { progress: 'Storing transcript chunks...' });
      try {
        await createTranscriptChunks(chunks);

        // Process chunks in batches
        await processChunksInBatches(chunks, jobId);

        // Update job status
        await updateVideoJob(jobId, {
          status: 'completed',
          transcriptStatus: 'found',
          progress: 'Processing complete'
        });
      } catch (error) {
        console.error('Error storing transcript chunks:', error);
        await updateVideoJob(jobId, {
          status: 'failed',
          transcriptStatus: 'error',
          progress: 'Failed to store transcript chunks'
        });
        throw error;
      }
    } else {
      // If no chunks were created, still mark as completed
      await updateVideoJob(jobId, {
        status: 'completed',
        transcriptStatus: 'not_found',
        progress: 'Video processed. You can now chat about the video using Gemini.'
      });
    }
  } catch (error) {
    console.error('Error processing video:', error);
    let errorMessage = 'Error during processing';
    
    if (error instanceof Error) {
      if (error.message.includes('private')) {
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
    const { youtubeUrl, testMode = false } = await request.json();
    
    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Add test mode logging
    if (testMode) {
      console.log('Running in test mode');
      console.log('Input URL:', youtubeUrl);
    }

    // Extract video ID
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    if (testMode) {
      console.log('Extracted video ID:', videoId);
    }

    // Check if this video has been processed before
    const collections = await getCollections();
    if (!collections.videoJobsCollection || !collections.transcriptChunksCollection) {
      throw new Error('Database collections not initialized');
    }

    if (testMode) {
      console.log('Checking for existing job...');
    }

    const existingJob = await collections.videoJobsCollection.findOne({ 
      youtubeUrl,
      status: 'completed',
      transcriptStatus: 'found'
    });

    if (testMode) {
      console.log('Existing job found:', existingJob ? 'Yes' : 'No');
    }

    if (existingJob) {
      // If we have an existing completed job with transcript, reuse it
      const existingChunks = await collections.transcriptChunksCollection.find({ jobId: existingJob.jobId }).toArray();
      if (existingChunks && existingChunks.length > 0) {
        // Create a new job that references the existing chunks
        const newJobId = uuidv4();
        await createVideoJob({
          jobId: newJobId,
          youtubeUrl,
          status: 'completed',
          transcriptStatus: 'found',
          progress: 'Using previously processed transcript'
        });

        // Copy existing chunks with new jobId
        const newChunks = existingChunks.map((chunk, index) => ({
          ...chunk,
          _id: undefined, // Let MongoDB generate new _id
          jobId: newJobId,
          chunkId: `${newJobId}-${index}`, // Use sequential index instead of reusing the old chunk number
          createdAt: new Date()
        }));

        try {
          await createTranscriptChunks(newChunks);
          return NextResponse.json({
            status: 'success',
            message: 'Video processing completed (reused existing transcript)',
            jobId: newJobId
          });
        } catch (error) {
          console.error('Error creating transcript chunks:', error);
          // If chunk creation fails, delete the job and throw error
          await collections.videoJobsCollection.deleteOne({ jobId: newJobId });
          throw new Error('Failed to create transcript chunks');
        }
      }
    }

    // If no existing job or chunks found, proceed with normal processing
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