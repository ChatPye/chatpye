import { NextRequest, NextResponse } from 'next/server';

interface Chapter {
  id: string;
  startTime: number; // in seconds
  title: string;
  summary: string;
}

// Dummy chapter data
const dummyChapters: Record<string, Chapter[]> = {
  'test-video-with-chapters': [
    { id: 'ch1', startTime: 0, title: 'Introduction', summary: 'This is the introduction to the video, covering the main topics that will be discussed.' },
    { id: 'ch2', startTime: 30, title: 'Chapter 1: The First Key Concept', summary: 'A detailed explanation of the first major concept presented in the video. This section breaks down the fundamentals.' },
    { id: 'ch3', startTime: 90, title: 'Chapter 2: Practical Application', summary: 'Showing a practical application or example of the concepts discussed earlier. Includes a step-by-step walkthrough.' },
    { id: 'ch4', startTime: 180, title: 'Chapter 3: Advanced Techniques', summary: 'Delving into more advanced techniques and considerations related to the video\'s subject matter.' },
    { id: 'ch5', startTime: 300, title: 'Conclusion & Summary', summary: 'A wrap-up of the main points discussed in the video, along with some concluding thoughts or next steps.' },
  ],
  'another-video-id': [ // Example for a different video
    { id: 'ach1', startTime: 10, title: 'Overview', summary: 'Brief overview of this other video.' },
    { id: 'ach2', startTime: 45, title: 'Main Point', summary: 'The central argument or feature.' },
  ]
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'videoId query parameter is required' }, { status: 400 });
  }

  // Simulate some delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const chapters = dummyChapters[videoId] || [];
  
  // Simulate an error for a specific videoId for testing purposes
  if (videoId === 'test-error-fetch') {
    return NextResponse.json({ error: 'Failed to fetch chapters for this video.' }, { status: 500 });
  }

  return NextResponse.json(chapters);
}
