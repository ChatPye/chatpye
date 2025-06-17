import { NextResponse } from 'next/server';
import { getCollections, VideoJob } from '@/lib/mongodb';
import { extractVideoId } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const youtubeUrlParam = searchParams.get('youtubeUrl');
    const youtubeVideoIdParam = searchParams.get('youtubeVideoId');

    let targetVideoId: string | null = null;

    if (youtubeVideoIdParam) {
      targetVideoId = youtubeVideoIdParam;
    } else if (youtubeUrlParam) {
      targetVideoId = extractVideoId(youtubeUrlParam);
    }

    if (!targetVideoId) {
      return NextResponse.json(
        { error: 'youtubeUrl or youtubeVideoId query parameter is required' },
        { status: 400 }
      );
    }

    const { videoJobsCollection } = await getCollections();
    if (!videoJobsCollection) {
      throw new Error('videoJobsCollection not initialized');
    }

    const query = {
      'processingMetadata.videoId': targetVideoId,
      status: 'completed'
    } as const;

    const jobs = await videoJobsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    if (jobs.length === 0) {
      return NextResponse.json(
        { error: 'No successfully processed transcript found for this video.' },
        { status: 404 }
      );
    }

    const latestJob = jobs[0];
    return NextResponse.json({ 
      jobId: latestJob.jobId, 
      youtubeUrl: latestJob.youtubeUrl,
      processedAt: latestJob.createdAt 
    });

  } catch (error) { 
    console.error('Error in /api/video/resolve-job:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { error: 'Failed to resolve video job', details: errorMessage },
      { status: 500 }
    );
  }
} 