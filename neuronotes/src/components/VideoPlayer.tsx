import React, { useRef } from 'react';
import ReactPlayer from 'react-player';
import { useVideoPlayer } from '@/context/VideoPlayerContext';

interface VideoPlayerProps {
  url: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url }) => {
  const playerRef = useRef<ReactPlayer>(null);
  const { updatePosition } = useVideoPlayer();

  const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
    updatePosition({
      played: state.played,
      playedSeconds: state.playedSeconds,
      duration: playerRef.current?.getDuration() || 0
    });
  };

  const handleDuration = (duration: number) => {
    updatePosition({
      played: 0,
      playedSeconds: 0,
      duration
    });
  };

  return (
    <div className='player-wrapper' style={{ 
      position: 'relative', 
      paddingTop: '56.25%' /* 16:9 aspect ratio */,
      height: '0' /* Height will be determined by the aspect ratio */,
      width: '100%',
      background: '#000',
      marginBottom: '1rem', /* Add some spacing below the video */
      overflow: 'hidden', /* Ensure content doesn't overflow rounded corners */
      boxShadow: '0 6px 12px rgba(0,0,0,0.15)', /* Optional: add subtle shadow for depth */
      borderRadius: '8px', /* Reduced curviness from 16px to 8px */
    }}>
      <ReactPlayer
        ref={playerRef}
        url={url}
        className='react-player'
        playing={false}
        controls={true}
        width='100%'
        height='100%'
        style={{ position: 'absolute', top: 0, left: 0 }}
        light={true}
        onProgress={handleProgress}
        onDuration={handleDuration}
        progressInterval={1000} // Update progress every 1 second
        config={{
          youtube: {
            playerVars: { 
              showinfo: 1,
              controls: 1,
              cc_load_policy: 1
            }
          }
        }}
      />
    </div>
  );
};

export default VideoPlayer;