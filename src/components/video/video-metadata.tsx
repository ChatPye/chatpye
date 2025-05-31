"use client"

import React from 'react';
import { Card } from '@/components/ui/card';
import { Clock, Calendar, Eye } from 'lucide-react';

interface VideoMetadataProps {
  videoId: string;
}

const VideoMetadata: React.FC<VideoMetadataProps> = ({ videoId }) => {
  // TODO: Fetch actual video metadata
  const metadata = {
    title: "Sample Video Title",
    description: "This is a sample video description that would normally be fetched from the API.",
    duration: "10:30",
    uploadDate: "2024-03-20",
    views: "1.2K"
  };

  return (
    <Card className="p-4 m-4">
      <h2 className="text-xl font-semibold mb-2">{metadata.title}</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">{metadata.description}</p>
      
      <div className="flex gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{metadata.duration}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          <span>{metadata.uploadDate}</span>
        </div>
        <div className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          <span>{metadata.views} views</span>
        </div>
      </div>
    </Card>
  );
};

export { VideoMetadata }; 