import { fetchTranscript } from 'youtube-transcript-plus';
import { extractVideoId } from './youtube-client';

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
      thumbnailUrl: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.default?.url,
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

export async function getYouTubeTranscript(youtubeUrl: string): Promise<TranscriptSegment[]> {
  try {
    const transcriptResponse = await fetchTranscript(youtubeUrl);
    
    if (!transcriptResponse || transcriptResponse.length === 0) {
      throw new Error("Library returned an empty transcript.");
    }

    const transcript: TranscriptSegment[] = transcriptResponse.map((item: any) => ({
      text: item.text,
      start: item.offset,
      duration: item.duration,
    }));
    
    return transcript;
  } catch (error) {
    console.error(`Error fetching transcript for URL: ${youtubeUrl}.`, error);
    throw new Error(`Failed to fetch transcript. It may not be available or is in an unsupported format.`);
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

export function getChaptersFromTranscript(transcript: TranscriptSegment[], chapterDurationThreshold: number = 300): { title: string; start: number }[] {
  if (!transcript || transcript.length === 0) {
    return [];
  }

  const chapters: { title: string; start: number }[] = [];
  let currentChapterText = '';
  let chapterStartTime = transcript[0].start;
  let lastSegmentEndTime = chapterStartTime;

  transcript.forEach((segment: any, index: number) => {
    const segmentEndTime = segment.start + segment.duration;

    // Check if there's a significant gap between segments to infer a new chapter
    if (segment.start - lastSegmentEndTime > 5 && currentChapterText) { // 5s gap
      chapters.push({ title: currentChapterText.trim(), start: chapterStartTime });
      currentChapterText = '';
      chapterStartTime = segment.start;
    }
    
    currentChapterText += segment.text + ' ';

    // Split chapters by duration as a fallback
    if (segmentEndTime - chapterStartTime >= chapterDurationThreshold && currentChapterText) {
      chapters.push({ title: currentChapterText.trim(), start: chapterStartTime });
      currentChapterText = '';
      chapterStartTime = segmentEndTime;
    }
    
    lastSegmentEndTime = segmentEndTime;
  });

  // Add the last chapter if it exists
  if (currentChapterText.trim()) {
    chapters.push({ title: currentChapterText.trim(), start: chapterStartTime });
  }

  // A simple heuristic to generate chapter titles from the chapter text
  return chapters.map(chapter => ({
    ...chapter,
    title: chapter.title.split(' ').slice(0, 5).join(' ') + '...'
  }));
}
