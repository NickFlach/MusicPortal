import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize2, Minimize2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState, useEffect, useRef } from "react";
import { DynamicBackground } from "./DynamicBackground";

export function MusicPlayer() {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    playNext,
    playPrevious,
    volume,
    setVolume,
    audioUrl,
  } = useMusicPlayer();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

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

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playNext]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentSong) return null;

  const MinimizedPlayer = () => (
    <Card className="fixed bottom-4 right-4 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border shadow-lg w-72 z-50">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{currentSong.title}</h3>
          <p className="text-sm text-muted-foreground truncate">{currentSong.artist}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={togglePlay}>
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsExpanded(true)}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Slider
        value={[currentTime]}
        max={duration}
        step={1}
        onValueChange={handleSeek}
        className="mt-2"
      />
    </Card>
  );

  const ExpandedPlayer = () => (
    <Sheet open={isExpanded} onOpenChange={setIsExpanded}>
      <SheetContent side="bottom" className="h-[80vh] p-0 bg-transparent border-none">
        <Card className="h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-t-[20px] overflow-hidden">
          <DynamicBackground />

          <div className="relative z-10 h-full p-6 flex flex-col">
            <SheetHeader className="mb-8">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-2xl">{currentSong.title}</SheetTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)}>
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
              <SheetDescription>{currentSong.artist}</SheetDescription>
            </SheetHeader>

            <div className="flex-1 flex flex-col justify-center gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm w-12 text-muted-foreground">
                    {formatTime(currentTime)}
                  </span>

                  <Slider
                    value={[currentTime]}
                    max={duration}
                    step={1}
                    onValueChange={handleSeek}
                    className="flex-1"
                  />

                  <span className="text-sm w-12 text-muted-foreground">
                    {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <Button variant="ghost" size="icon" onClick={playPrevious}>
                    <SkipBack className="h-5 w-5" />
                  </Button>

                  <Button 
                    variant="default" 
                    size="icon" 
                    className="h-12 w-12"
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6" />
                    )}
                  </Button>

                  <Button variant="ghost" size="icon" onClick={playNext}>
                    <SkipForward className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <Slider
                  value={[volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="w-32"
                />
              </div>
            </div>
          </div>
        </Card>
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        onError={(e) => console.error('Audio error:', e)}
      />
      <MinimizedPlayer />
      <ExpandedPlayer />
    </>
  );
}