import { NextResponse } from 'next/server'
import { getVideoJob } from '@/lib/mongodb'

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    console.log('Fetching job status for:', jobId)
    const job = await getVideoJob(jobId)
    
    if (!job) {
      console.log('Job not found:', jobId)
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    console.log('Job status:', job.status, 'Progress:', job.progress)
    return NextResponse.json(job)
  } catch (error) {
    console.error('Error in status endpoint:', error)
    // Return a more detailed error response
    return NextResponse.json(
      { 
        error: 'Failed to fetch job status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 