import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json(
      { error: 'Video ID is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`Fetching video info for ID: ${videoId}`);
    
    const response = await fetch(
      `https://chattube.io/api/get-youtube-info?videoId=${videoId}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Chattube API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Video info fetched successfully');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching video info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video information' },
      { status: 500 }
    );
  }
}