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

    // First check if captions are available
    const captionsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${process.env.YOUTUBE_API_KEY}`
    );

    if (!captionsResponse.ok) {
      const error = await captionsResponse.json();
      if (error.error?.code === 403) {
        throw new Error('This video has captions disabled or restricted. Please try a different video with captions enabled.');
      }
      throw new Error('Failed to check video captions availability.');
    }

    // Try to fetch transcript using youtube-transcript as fallback
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'en'
      });
      
      if (!transcript || transcript.length === 0) {
        console.error('No transcript found for video:', videoId);
        return null;
      }
      
      // Transform to our format
      return transcript.map(segment => ({
        text: segment.text,
        start: segment.offset,
        duration: segment.duration
      }));
    } catch (transcriptError) {
      console.error('Error fetching transcript with youtube-transcript:', transcriptError);
      
      // If youtube-transcript fails, try to fetch captions directly
      const captionsData = await captionsResponse.json();
      if (!captionsData.items || captionsData.items.length === 0) {
        throw new Error('No captions found for this video. Please try a different video with captions enabled.');
      }

      // Get the first available caption track
      const captionId = captionsData.items[0].id;
      const captionResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/captions/${captionId}?key=${process.env.YOUTUBE_API_KEY}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.YOUTUBE_API_KEY}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!captionResponse.ok) {
        throw new Error('Failed to fetch video captions. Please try a different video.');
      }

      const captionData = await captionResponse.json();
      // Parse the caption data and transform it to our format
      // This is a simplified example - you'll need to parse the actual caption format
      return captionData.items.map((item: any) => ({
        text: item.text,
        start: item.start,
        duration: item.duration
      }));
    }
  } catch (error) {
    console.error('Error fetching YouTube transcript:', error);
    if (error instanceof Error) {
      if (error.message.includes('Could not get the transcript')) {
        throw new Error('This video does not have captions available. Please try a different video with captions enabled.');
      } else if (error.message.includes('Transcript is disabled')) {
        throw new Error('This video has captions disabled. Please try a different video with captions enabled.');
      } else if (error.message.includes('Video is private')) {
        throw new Error('This video is private. Please try a public video.');
      } else if (error.message.includes('Video is restricted')) {
        throw new Error('This video is restricted. Please try a different video.');
      }
    }
    throw new Error('Failed to fetch transcript. Please try a different video.');
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