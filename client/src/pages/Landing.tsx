import { useAccount } from 'wagmi';
import { WalletConnect } from "@/components/WalletConnect";
import { useLocation } from 'wouter';
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from 'react';

export default function Landing() {
  const { address } = useAccount();
  const [, setLocation] = useLocation();
  const { isMuted, toggleMute, currentSong } = useMusicPlayer();

  useEffect(() => {
    if (address) {
      setLocation("/");
    }
  }, [address, setLocation]);

  if (address) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              Music Portal
            </h1>
          </div>
          <WalletConnect />
        </div>

        <div className="flex flex-col items-center justify-center mt-24 space-y-6">
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="hover:scale-110 transition-transform"
            >
              {isMuted ? (
                <VolumeX className="h-6 w-6" />
              ) : (
                <Volume2 className="h-6 w-6" />
              )}
            </Button>
            {currentSong && (
              <p className="text-sm text-muted-foreground animate-pulse">
                Now Playing: {currentSong.title} - {currentSong.artist}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}