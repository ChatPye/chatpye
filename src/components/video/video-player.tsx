"use client"

import React from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { Card } from "@/components/ui/card";
import { useVideoPlayer } from '@/contexts/video-player-context';

interface VideoPlayerProps {
  videoId: string;
}

export function VideoPlayer({ videoId }: VideoPlayerProps) {
  const { registerSeekFunction } = useVideoPlayer();

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    // Access the player instance
    const player = event.target;
    // Register the seek function from the player instance
    if (player && typeof player.seekTo === 'function') {
      registerSeekFunction(player.seekTo.bind(player));
    } else {
      console.error("Failed to register seekTo function: Player or seekTo method not available.");
    }
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 1,
      modestbranding: 1,
      rel: 0,
      origin: window.location.origin,
      enablejsapi: 1,
      widget_referrer: window.location.origin
    }
  };

  return (
    <Card className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <YouTube
        videoId={videoId}
        opts={opts}
        onReady={onPlayerReady}
        onError={(error: Error) => console.error('YouTube Player Error:', error)}
        className="h-full w-full"
        iframeClassName="h-full w-full"
      />
    </Card>
  );
}