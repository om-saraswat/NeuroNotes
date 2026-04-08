"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface VideoPlayerContextType {
  currentPosition: {
    duration: number;
    played: number;
    playedSeconds: number;
  };
  updatePosition: (state: { played: number; playedSeconds: number; duration?: number }) => void;
}

const defaultContext: VideoPlayerContextType = {
  currentPosition: { played: 0, playedSeconds: 0, duration: 0 },
  updatePosition: () => {},
};

const VideoPlayerContext = createContext<VideoPlayerContextType>(defaultContext);

export const useVideoPlayer = () => useContext(VideoPlayerContext);

export const VideoPlayerProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [currentPosition, setCurrentPosition] = useState({ played: 0, playedSeconds: 0, duration: 0 });

  const updatePosition = (state: { played: number; playedSeconds: number; duration?: number }) => {
    setCurrentPosition(prev => ({
      ...prev,
      ...state,
      duration: state.duration !== undefined ? state.duration : prev.duration
    }));
  };

  return (
    <VideoPlayerContext.Provider value={{ currentPosition, updatePosition }}>
      {children}
    </VideoPlayerContext.Provider>
  );
};