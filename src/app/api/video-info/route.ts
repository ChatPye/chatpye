import { NextResponse } from "next/server"
import { getVideoDetails } from "@/lib/youtube"
import { extractVideoId } from "@/lib/youtube"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get("videoId")

  if (!videoId) {
    return NextResponse.json(
      { error: "Video ID is required" },
      { status: 400 }
    )
  }

  try {
    const videoDetails = await getVideoDetails(videoId)
    return NextResponse.json(videoDetails)
  } catch (error) {
    console.error("Error fetching video details:", error)
    return NextResponse.json(
      { error: "Failed to fetch video details" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { youtubeUrl } = await request.json()
    
    if (!youtubeUrl) {
      return NextResponse.json({ error: 'youtubeUrl is required' }, { status: 400 })
    }

    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    const details = await getVideoDetails(videoId)
    return NextResponse.json(details)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    console.error('Error processing video info:', error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
} 