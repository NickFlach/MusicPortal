import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useState, useEffect, useRef } from "react";

export function MusicPlayer() {
  const {
    currentSong,
    isPlaying,
    playNext,
    volume,
    setVolume,
    audioUrl,
    isPlayerVisible,
    togglePlayPause,
  } = useMusicPlayer();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Handle when audioUrl changes - set up new audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    console.log('Setting up audio with URL:', audioUrl);

    const playAudio = async () => {
      try {
        audio.load(); // Force reload with new source
        if (isPlaying) {
          console.log('Attempting to play audio...');
          try {
            await audio.play();
            console.log('Audio playing successfully');
          } catch (e) {
            console.error('Error in play():', e);
          }
        } else {
          console.log('Audio loaded but not playing (isPlaying is false)');
        }
      } catch (error) {
        console.error('Error in playAudio:', error);
      }
    };

    playAudio();
  }, [audioUrl, isPlaying]);

  // Setup audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      playNext();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    // Set initial volume
    audio.volume = isMuted ? 0 : volume;

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playNext, volume, isMuted]);

  // Handle play/pause changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log('Play/Pause status changed:', isPlaying);
    if (isPlaying) {
      audio.play().catch(error => console.error('Error playing:', error));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Handle volume and mute changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentSong || !isPlayerVisible) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        crossOrigin="anonymous"
      />
      <Card className="fixed bottom-4 right-4 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border shadow-lg w-72 z-50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{currentSong.title}</h3>
            <p className="text-sm text-muted-foreground truncate">{currentSong.artist}</p>
          </div>

          <Button variant="ghost" size="icon" onClick={togglePlayPause}>
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button variant="ghost" size="icon" onClick={handleMuteToggle}>
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          className="mt-2"
        />
      </Card>
    </>
  );
}