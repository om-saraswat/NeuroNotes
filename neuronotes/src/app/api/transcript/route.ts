import { NextRequest, NextResponse } from 'next/server';

interface TactiqCaption {
  start: string;
  dur: string;
  text: string;
}

interface TactiqResponse {
  title: string;
  captions: TactiqCaption[];
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const videoId = url.searchParams.get('videoId');
    const start = parseFloat(url.searchParams.get('start') || '0');
    const end = parseFloat(url.searchParams.get('end') || '0');
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    console.log(`Fetching transcript for video: ${videoId}, time range: ${formatTime(start)}-${formatTime(end)}`);
    
    // Get transcript from Tactiq.io API
    const transcriptText = await fetchRealTranscript(videoId, start, end);
    
    return NextResponse.json({ transcript: transcriptText });
    
  } catch (error) {
    console.error('Error with transcript:', error);
    return NextResponse.json({ 
      error: 'Failed to generate transcript',
      details: (error as Error).message
    }, { status: 500 });
  }
}

// Fetch real transcript from Tactiq.io API
async function fetchRealTranscript(videoId: string, start: number, end: number): Promise<string> {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    const response = await fetch('https://tactiq-apps-prod.tactiq.io/transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoUrl: videoUrl,
        langCode: 'en'
      })
    });

    if (!response.ok) {
      throw new Error(`Tactiq API error: ${response.status} ${response.statusText}`);
    }

    const data: TactiqResponse = await response.json();
    // console.log(`Fetched transcript for video ${videoId}:`, data.title);
    
    // Convert captions to readable transcript format
    const fullTranscript = convertCaptionsToTranscript(data.captions);
    
    // Filter transcript by time range if specified
    if (start > 0 || end > 0) {
      const filteredTranscript = filterTranscriptByTime(data.captions, start, end);;
      
      if (filteredTranscript === '') {
        return `No transcript content found for time range ${formatTime(start)}-${formatTime(end)}`;
      }
      return filteredTranscript;
    }
    
    return fullTranscript;
    
  } catch (error) {
    console.error('Error fetching from Tactiq API:', error);
    return "Transcript not available";
  }
}

// Convert captions array to readable transcript
function convertCaptionsToTranscript(captions: TactiqCaption[]): string {
  return captions.map(caption => {
    const startTime = parseFloat(caption.start);
    const formattedTime = formatTimeFromSeconds(startTime);
    return `${formattedTime} ${caption.text}`;
  }).join('\n');
}

// Filter captions by time range and convert to transcript
function filterTranscriptByTime(captions: TactiqCaption[], start: number, end: number): string {
  const filteredCaptions = captions.filter(caption => {
    const startTime = parseFloat(caption.start);
    const endTime = startTime + parseFloat(caption.dur);
    
    // Include caption if it overlaps with the requested time range
    if (start === 0 && end === 0) return true; // No filtering
    if (start === 0) return startTime <= end; // Only end time specified
    if (end === 0) return endTime >= start; // Only start time specified
    return startTime <= end && endTime >= start; // Both start and end specified
  });
  
  if (filteredCaptions.length === 0) {
    return `No transcript content found for time range ${formatTime(start)}-${formatTime(end)}`;
  }
  
  return filteredCaptions.map(caption => {
    const startTime = parseFloat(caption.start);
    const formattedTime = formatTimeFromSeconds(startTime);
    return `${formattedTime} ${caption.text}`;
  }).join('\n');
}

// Format seconds to MM:SS format
function formatTimeFromSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format time for logging
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
