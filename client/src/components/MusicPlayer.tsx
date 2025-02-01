import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useAccount } from 'wagmi';
import { useLocation } from 'wouter';

export function MusicPlayer() {
  const {
    currentSong,
    isPlaying,
    duration,
    currentTime,
    volume,
    togglePlay,
    playNext,
    playPrevious,
    handleSeek,
    handleVolumeChange,
  } = useMusicPlayer();

  const { address } = useAccount();
  const [location] = useLocation();
  const isAllowedPage = ["/", "/treasury", "/admin"].includes(location);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentSong || !address || !isAllowedPage) return null;

  return (
    <Card className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-50">
      <div className="container mx-auto">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{currentSong.title}</h3>
              <p className="text-sm text-muted-foreground">{currentSong.artist}</p>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={playPrevious}>
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button variant="default" size="icon" onClick={togglePlay}>
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>

              <Button variant="ghost" size="icon" onClick={playNext}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </div>

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
  );
}