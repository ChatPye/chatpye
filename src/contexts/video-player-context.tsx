"use client"

import React, { createContext, useContext, useRef, ReactNode } from 'react';

interface VideoPlayerContextType {
  registerSeekFunction: (seekFn: (time: number, allowSeekAhead?: boolean) => void) => void;
  seekTo: (time: number, allowSeekAhead?: boolean) => void;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);

export const useVideoPlayer = (): VideoPlayerContextType => {
  const context = useContext(VideoPlayerContext);
  if (!context) {
    throw new Error('useVideoPlayer must be used within a VideoPlayerProvider');
  }
  return context;
};

interface VideoPlayerProviderProps {
  children: ReactNode;
}

export const VideoPlayerProvider: React.FC<VideoPlayerProviderProps> = ({ children }) => {
  const seekFunctionRef = useRef<((time: number, allowSeekAhead?: boolean) => void) | null>(null);

  const registerSeekFunction = (seekFn: (time: number, allowSeekAhead?: boolean) => void) => {
    seekFunctionRef.current = seekFn;
  };

  const seekTo = (time: number, allowSeekAhead: boolean = true) => {
    if (seekFunctionRef.current) {
      seekFunctionRef.current(time, allowSeekAhead);
    } else {
      console.warn('Seek function not registered yet.');
    }
  };

  return (
    <VideoPlayerContext.Provider value={{ registerSeekFunction, seekTo }}>
      {children}
    </VideoPlayerContext.Provider>
  );
};
