"use client";
import React, { useState, useEffect } from "react";
import Linkify from 'linkify-react';

interface VideoInfo {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  lengthSeconds: string;
  viewCount: string;
  publishDate: string;
  thumbnail: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  keywords?: string[];
  category?: string;
}

interface VideoDetailsViewerProps {
  videoUrl: string;
}

const linkifyOptions = {
  defaultProtocol: 'https',
  target: '_blank',
  rel: 'noopener noreferrer',
  className: 'text-blue-500 hover:text-blue-700 hover:underline'
};

const VideoDetailsViewer: React.FC<VideoDetailsViewerProps> = ({ videoUrl }) => {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract video ID from YouTube URL
  const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  useEffect(() => {
    const fetchVideoInfo = async () => {
      if (!videoUrl) return;

      const videoId = extractVideoId(videoUrl);
      if (!videoId) {
        setError("Invalid YouTube URL");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log(`Fetching video info for video ID: ${videoId}`);
        
        // Using local API route instead of direct external API call
        const response = await fetch(`/api/youtube/info?videoId=${videoId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch video info: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Video info received:', data);
        setVideoInfo(data);

        // Previous direct API call commented out:
        /*
        const response = await fetch(`https://chattube.io/api/get-youtube-info?videoId=${videoId}`);
        */

      } catch (err) {
        console.error("Error fetching video info:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch video information");
      } finally {
        setLoading(false);
      }
    };

    fetchVideoInfo();
  }, [videoUrl]);

  // Format duration from seconds to readable format
  const formatDuration = (seconds: string): string => {
    const totalSeconds = parseInt(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format view count
  const formatViewCount = (count: string): string => {
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M views`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K views`;
    }
    return `${num} views`;
  };

  // Format publish date
  const formatPublishDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading video details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!videoInfo) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        <p className="text-sm">No video information available</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      <div className="flex-1 p-4 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-700">
        <div className="space-y-4">
          {/* Video Title */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white break-words">
              {videoInfo.title}
            </h2>
          </div>

          {/* Video Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>{formatViewCount(videoInfo.viewCount)}</span>
            <span>•</span>
            <span>{formatDuration(videoInfo.lengthSeconds)}</span>
            <span>•</span>
            <span>{formatPublishDate(videoInfo.publishDate)}</span>
          </div>

          {/* Channel Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {videoInfo.channelTitle.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {videoInfo.channelTitle}
              </p>
              {videoInfo.category && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {videoInfo.category}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Description
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 break-words">
              <div className="whitespace-pre-wrap">
                <Linkify options={linkifyOptions}>
                  {videoInfo.description}
                </Linkify>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetailsViewer;