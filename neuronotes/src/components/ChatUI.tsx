import React, { useState, useEffect, useRef } from "react";
import { useVideoPlayer } from '../context/VideoPlayerContext';

interface ChatUIProps {
  source: {
    type: 'youtube' | 'markdown';
    content: string;  // YouTube URL or markdown text
    contentTitle?: string;
  };
}

interface Message {
  message: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

const ChatUI: React.FC<ChatUIProps> = ({ source = { type: 'markdown', content: '' } }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      message: "Hello! I'm here to help you with this content. Feel free to ask me any questions!",
      sender: "bot",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [windowSize] = useState(2);
  const [transcript, setTranscript] = useState("");
  const [isTranscriptFetching, setIsTranscriptFetching] = useState(false);
  const [customTimeRange, setCustomTimeRange] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [showTimeRange, setShowTimeRange] = useState(false);
  const [manualStartTime, setManualStartTime] = useState(0);
  const [manualEndTime, setManualEndTime] = useState(300);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastFetchedPosition = useRef(0);
  const { currentPosition } = useVideoPlayer();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize time range based on current video position
  useEffect(() => {
    if (source?.type === 'youtube' && currentPosition?.playedSeconds > 0) {
      const currentTime = currentPosition.playedSeconds;
      const videoDuration = currentPosition.duration || 600;
      setManualStartTime(Math.max(0, currentTime - 150)); // 2.5 min before
      setManualEndTime(Math.min(videoDuration, currentTime + 150)); // 2.5 min after, capped at video duration
    }
  }, [source?.type, currentPosition?.playedSeconds]);

  // Extract YouTube video ID from URL if needed
  const getYouTubeVideoId = (url: string): string => {
    try {
      if (url.includes('youtube.com')) {
        return new URL(url).searchParams.get('v') || '';
      } else if (url.includes('youtu.be')) {
        return url.split('/').pop() || '';
      }
      return '';
    } catch (e) {
      console.error('Error parsing YouTube URL:', e);
      return '';
    }
  };

  // Fetch transcript when using YouTube mode and position changes
  useEffect(() => {
    if (source?.type === 'youtube' && source?.content && currentPosition?.playedSeconds > 0) {
      if (
        Math.abs(currentPosition?.playedSeconds - lastFetchedPosition.current) > 30 ||
        lastFetchedPosition.current === 0
      ) {
        lastFetchedPosition.current = currentPosition?.playedSeconds || 0;

        if (!customTimeRange) {
          fetchTranscript();
        }
      }
    }
  }, [currentPosition?.playedSeconds, source?.type, source?.content, windowSize, customTimeRange]);

  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const fetchTranscript = async (useCustomRange = false) => {
    const videoId = source?.type === 'youtube' ? getYouTubeVideoId(source.content) : '';

    if (!videoId) {
      console.log("No valid YouTube video ID available, skipping transcript fetch");
      return;
    }

    try {
      setIsTranscriptFetching(true);

      let fetchStart, fetchEnd;

      if (useCustomRange) {
        fetchStart = manualStartTime;
        fetchEnd = manualEndTime;
      } else {
        if (!currentPosition || typeof currentPosition.playedSeconds !== 'number') {
          console.warn("Invalid or missing currentPosition, using default values");
          fetchStart = 0;
          fetchEnd = 300;
        } else {
          fetchStart = Math.max(0, currentPosition.playedSeconds - (windowSize * 60));
          fetchEnd = currentPosition.playedSeconds + (windowSize * 60);
        }
      }

      setStartTime(fetchStart);
      setEndTime(fetchEnd);

      console.log(`Fetching transcript for video ${videoId} from ${formatTime(fetchStart)} to ${formatTime(fetchEnd)}`);
      const res = await fetch(`/api/transcript?videoId=${videoId}&start=${fetchStart}&end=${fetchEnd}`);

      if (!res.ok) {
        throw new Error(`Failed to fetch transcript: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      if (data.transcript) {
        console.log(`Received transcript with length: ${data.transcript.length} characters`);
        setTranscript(data.transcript);
      } else {
        console.warn("Received empty transcript");
        setTranscript("No transcript available for this section of the video.");
      }
    } catch (error) {
      console.error("Error fetching transcript:", error);
      setTranscript("Failed to load transcript. Please try again later.");
    } finally {
      setIsTranscriptFetching(false);
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      message: inputMessage,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const lastTwoMessages = [...messages, userMessage].slice(-3);

      let context = '';
      if (source?.type === 'youtube') {
        context = transcript;

        if (!context || context.length < 10) {
          const errorMessage: Message = {
            message: "I don't have any transcript context for this part of the video. Please wait while I fetch the latest transcript.",
            sender: "bot",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, errorMessage]);
          await fetchTranscript(customTimeRange);
          context = transcript;
        }
      } else {
        context = source?.content || '';
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: lastTwoMessages,
          context: context,
          sourceType: source?.type || 'markdown',
          contentTitle: source?.contentTitle || ''
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get response: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();

      const botMessage: Message = {
        message: responseData.reply,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Error in chat:", error);
      const errorMessage: Message = {
        message: "Sorry, I encountered an error while processing your request. Please try again.",
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Update the manual time range setters
  const handleStartTimeChange = (value: number) => {
    const newStart = Number(value);

    // Don't allow start to exceed end - 10 seconds
    const validStart = Math.min(newStart, manualEndTime - 10);

    // Enforce 5-minute max range
    const maxRangeExceeded = manualEndTime - validStart > 300;

    setManualStartTime(validStart);

    // Only adjust end time if max range is exceeded
    if (maxRangeExceeded) {
      setManualEndTime(validStart + 300);
    }
  };

  const handleEndTimeChange = (value: number) => {
    const newEnd = Number(value);

    // Don't allow end to be less than start + 10 seconds
    const validEnd = Math.max(newEnd, manualStartTime + 10);

    // Enforce 5-minute max range
    const maxRangeExceeded = validEnd - manualStartTime > 300;

    setManualEndTime(validEnd);

    // Only adjust start time if max range is exceeded
    if (maxRangeExceeded) {
      setManualStartTime(validEnd - 300);
    }
  };

  const setCurrentContextWindow = () => {
    if (currentPosition?.playedSeconds) {
      const currentTime = currentPosition.playedSeconds;
      const videoDuration = currentPosition.duration || 600;

      // Calculate the start and end times (±2.5 minutes from current position)
      const start = Math.max(0, currentTime - 150); // 2.5 min = 150 seconds
      const end = Math.min(videoDuration, currentTime + 150);

      setManualStartTime(start);
      setManualEndTime(end);
      setCustomTimeRange(true);
      fetchTranscript(true);
    }
  };

  const fetchCustomRangeTranscript = () => {
    setCustomTimeRange(true);
    fetchTranscript(true);
  };

  const RangeSliderStyles = () => (
    <style jsx global>{`
      /* Style for range inputs to display as a dual slider */
      input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #3b82f6; /* blue-500 */
        border: 2px solid white;
        cursor: pointer;
      }

      .dark input[type=range]::-webkit-slider-thumb {
        border-color: #18181b; /* zinc-900 */
        background: #2563eb; /* blue-600 */
      }

      input[type=range]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #3b82f6;
        border: 2px solid white;
        cursor: pointer;
      }

      .dark input[type=range]::-moz-range-thumb {
        border-color: #18181b;
        background: #2563eb;
      }

      input[type=range]::-ms-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #3b82f6;
        border: 2px solid white;
        cursor: pointer;
      }

      .dark input[type=range]::-ms-thumb {
        border-color: #18181b;
        background: #2563eb;
      }

      /* Hide the track */
      input[type=range]::-webkit-slider-runnable-track {
        -webkit-appearance: none;
        appearance: none;
        height: 2px;
        background: transparent;
      }

      input[type=range]::-moz-range-track {
        height: 2px;
        background: transparent;
      }

      input[type=range]::-ms-track {
        height: 2px;
        background: transparent;
      }
    `}</style>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 text-black dark:text-white">
      <RangeSliderStyles />

      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/90 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">AI Assistant</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {source?.type === 'youtube' ? 'Discussing video content' : 'Analyzing document'}
            </p>
          </div>

          {source?.type === 'youtube' && (
            <button
              onClick={() => setShowTimeRange(!showTimeRange)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {showTimeRange ? 'Hide Range' : 'Set Range'}
            </button>
          )}
        </div>

        {/* Time Range Control */}
        {source?.type === 'youtube' && showTimeRange && (
          <div className="mt-4 p-4 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Time Range</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {((manualEndTime - manualStartTime) / 60).toFixed(1)} minutes
                  {(manualEndTime - manualStartTime) / 60 >= 5 &&
                    <span className="ml-1 text-blue-500 dark:text-blue-400">(max)</span>
                  }
                </span>
              </div>

              {/* Dual Range Slider */}
              <div className="relative pt-6 pb-2">
                {/* Time indicators */}
                <div className="absolute top-0 left-0 right-0 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Start: {formatTime(manualStartTime)}</span>
                  <span>End: {formatTime(manualEndTime)}</span>
                </div>

                {/* Track */}
                <div className="absolute h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg left-0 right-0 top-6"></div>

                {/* Active track */}
                <div
                  className="absolute h-2 bg-blue-500 dark:bg-blue-600 rounded-lg top-6"
                  style={{
                    left: `${(manualStartTime / (currentPosition?.duration || 600)) * 100}%`,
                    right: `${100 - ((manualEndTime / (currentPosition?.duration || 600)) * 100)}%`
                  }}
                ></div>

                {/* Start thumb */}
                <input
                  type="range"
                  min={0}
                  max={currentPosition?.duration || 600}
                  step={1}
                  value={manualStartTime}
                  onChange={(e) => handleStartTimeChange(Number(e.target.value))}
                  className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer top-6"
                  style={{
                    pointerEvents: 'auto',
                    zIndex: 20,
                  }}
                />

                {/* End thumb */}
                <input
                  type="range"
                  min={0}
                  max={currentPosition?.duration || 600}
                  step={1}
                  value={manualEndTime}
                  onChange={(e) => handleEndTimeChange(Number(e.target.value))}
                  className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer top-6"
                  style={{
                    pointerEvents: 'auto',
                    zIndex: 20,
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={setCurrentContextWindow}
                  className="px-3 py-1.5 text-xs border border-gray-200 dark:border-zinc-700 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  Current ±2.5min
                </button>
                <button
                  onClick={fetchCustomRangeTranscript}
                  disabled={isTranscriptFetching}
                  className="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-opacity disabled:opacity-50"
                >
                  {isTranscriptFetching ? '⏳ Loading...' : 'Apply Range'}
                </button>
              </div>

              {customTimeRange && (
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span>Context: {formatTime(startTime)} - {formatTime(endTime)}</span>
                  {isTranscriptFetching && (
                    <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] ${msg.sender === 'user' ? 'order-2' : 'order-1'}`}>
              <div
                className={`px-4 py-3 rounded-2xl shadow-sm ${msg.sender === 'user'
                    ? 'bg-blue-500 text-white ml-auto'
                    : 'bg-gray-50 dark:bg-zinc-800 text-black dark:text-white border border-gray-200 dark:border-zinc-700'
                  }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
              </div>
              <div className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'
                }`}>
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 px-4 py-3 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/90 px-6 py-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about the content..."
              className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-500 dark:placeholder-gray-400"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim() || isLoading}
            className="flex-shrink-0 w-11 h-11 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>{inputMessage.length}/1000</span>
        </div>
      </div>
    </div>
  );
};

export default ChatUI;