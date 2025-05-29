import { YoutubeTranscript } from 'youtube-transcript';

export function isValidYouTubeUrl(url: string): boolean {
  const patterns = [
    /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})(?:&[^&\n]*)?$/,
    /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\?[^&\n]*)?$/,
    /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ]
  return patterns.some(pattern => pattern.test(url))
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}

export async function getVideoDetails(videoId: string) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`
    )

    if (!response.ok) {
      throw new Error("Failed to fetch video details")
    }

    const data = await response.json()

    if (!data.items?.[0]) {
      throw new Error("Video not found")
    }

    const video = data.items[0]
    return {
      title: video.snippet?.title,
      description: video.snippet?.description,
      channelTitle: video.snippet?.channelTitle,
      publishedAt: video.snippet?.publishedAt,
    }
  } catch (error) {
    console.error("Error fetching video details:", error)
    throw error
  }
}

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export async function getYouTubeTranscript(videoUrl: string): Promise<TranscriptSegment[] | null> {
  try {
    // Extract video ID from URL
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Fetch transcript
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    // Transform to our format
    return transcript.map(segment => ({
      text: segment.text,
      start: segment.offset,
      duration: segment.duration
    }));
  } catch (error) {
    console.error('Error fetching YouTube transcript:', error);
    return null;
  }
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    remainingSeconds.toString().padStart(2, '0')
  ].join(':');
} 