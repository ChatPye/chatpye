"use client"

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface ExampleVideosProps {
  onSelectVideo: (videoId: string) => void;
}

const exampleVideos = [
  {
    id: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
  },
  {
    id: 'jNQXAC9IVRw',
    title: 'Me at the zoo',
    thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/maxresdefault.jpg'
  },
  {
    id: 'kJQP7kiw5Fk',
    title: 'Despacito',
    thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/maxresdefault.jpg'
  }
];

export const ExampleVideos: React.FC<ExampleVideosProps> = ({ onSelectVideo }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {exampleVideos.map((video) => (
        <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <div className="relative aspect-video group">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
              <Button
                variant="secondary"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onSelectVideo(video.id)}
              >
                <Play className="h-6 w-6" />
              </Button>
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-medium line-clamp-2 text-gray-900 dark:text-gray-100">{video.title}</h3>
          </div>
        </Card>
      ))}
    </div>
  );
}; 