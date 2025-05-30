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
    height: '100%', // Make player responsive
    width: '100%',  // Make player responsive
    playerVars: {
      // https://developers.google.com/youtube/player_parameters
      autoplay: 0, // Autoplay disabled
      rel: 0, // Disable related videos at the end
      modestbranding: 1, // Reduce YouTube logo
      // enablejsapi: 1, // Already enabled by react-youtube
    },
  };

  return (
    <Card className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <YouTube
        videoId={videoId}
        opts={opts}
        onReady={onPlayerReady}
        className="h-full w-full" // Ensure YouTube component fills the card
        iframeClassName="h-full w-full" // Ensure iframe fills the component
      />
    </Card>
  );
}