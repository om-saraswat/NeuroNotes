import { NextResponse } from 'next/server';
import { Innertube, UniversalCache } from 'youtubei.js';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const videoUrl = url.searchParams.get('videoUrl');
    
    if (!videoUrl) {
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
    }
    
    // Extract video ID from URL
    const videoId = extractVideoId(videoUrl);
    
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }
    
    console.log(`Fetching video details for ID: ${videoId}`);
      
    // Use the same configuration that works in mind maps
    const youtube = await Innertube.create({ cache: new UniversalCache(false) });
    
    // Instead of getInfo, search for the video by ID which works in Vercel
    const search = await youtube.search(videoId);
    
    // Find the video in search results
    let videoData = null;
    for (const item of search.videos) {
      if (item && (item as any).id === videoId) {
        videoData = item as any;
        break;
      }
    }
    
    if (!videoData) {
      // If not found by ID, try searching by the full URL
      const urlSearch = await youtube.search(videoUrl);
      for (const item of urlSearch.videos) {
        if (item && (item as any).id === videoId) {
          videoData = item as any;
          break;
        }
      }
    }
    
    if (!videoData) {
      throw new Error('Video not found');
    }
    
    console.log(`Successfully found video: ${videoData.title?.text || 'Unknown title'}`);
    console.log('Video data structure:', JSON.stringify(videoData, null, 2));
    
    // Try multiple possible paths for description like in mind maps route
    let description = 'No description available';
    if (videoData.description_snippet?.text) {
      description = videoData.description_snippet.text;
    } else if (videoData.short_description?.text) {
      description = videoData.short_description.text;
    } else if (videoData.snippet?.text) {
      description = videoData.snippet.text;
    } else if (videoData.description?.text) {
      description = videoData.description.text;
    } else if (typeof videoData.description === 'string') {
      description = videoData.description;
    }
    
    // Create response with data from search results
    const response = NextResponse.json({
      title: videoData.title?.text || videoId,
      description: description,
    });
    
    // Add cache-control headers for browsers and CDNs
    response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400'); // 24 hours
    
    return response;
  } catch (error) {
    console.error('API error:', error);
    
    // More detailed error logging for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch video details',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Function to extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}