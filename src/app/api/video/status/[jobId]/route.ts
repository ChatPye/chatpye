import { NextResponse } from 'next/server'
import { getVideoJob } from '@/lib/mongodb'

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params
    const job = await getVideoJob(jobId)

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      status: job.status,
      transcriptStatus: job.transcriptStatus,
      youtubeUrl: job.youtubeUrl,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    })
  } catch (error) {
    console.error('Error fetching job status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    )
  }
} 