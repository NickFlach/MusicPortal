import { useAccount, useConnect } from 'wagmi';
import { WalletConnect } from "@/components/WalletConnect";
import { useLocation } from 'wouter';
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from 'react';
import { apiRequest } from "@/lib/queryClient";

export default function Landing() {
  const { address } = useAccount();
  const { connect, connectors } = useConnect();
  const [, setLocation] = useLocation();
  const { isMuted, toggleMute, currentSong } = useMusicPlayer();

  // Auto-connect wallet and initialize music on page load
  useEffect(() => {
    async function initializeApp() {
      try {
        // Try to auto-connect to first available connector
        const connector = connectors[0];
        if (connector && !address) {
          await connect({ connector });
        }

        // Get initial song even if wallet isn't connected yet
        const response = await apiRequest("GET", "/api/songs/recent", undefined, {
          headers: {
            'X-Internal-Token': 'landing-page'  // Special token for internal API access
          }
        });
        const songs = await response.json();
        if (songs?.[0]) {
          // TODO: Initialize player with first song
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    }

    initializeApp();
  }, []);

  useEffect(() => {
    if (address) {
      setLocation("/home");
    }
  }, [address, setLocation]);

  if (address) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("/neo_token_logo_flaukowski.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(8px)',
          transform: 'scale(1.1)',
          opacity: '0.15'
        }}
      />

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2">
            <img 
              src="/neo_token_logo_flaukowski.png" 
              alt="NEO Token"
              className="w-12 h-12"
            />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              Music Portal
            </h1>
          </div>
          <WalletConnect />
        </div>

        {/* Centered Logo with Link */}
        <div className="flex flex-col items-center justify-center mt-24 space-y-6">
          <a 
            href="https://app.pitchforks.social/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-lg"
          >
            <img 
              src="/neo_token_logo_flaukowski.png" 
              alt="NEO Token"
              className="w-64 h-64 object-contain hover:animate-pulse"
            />
          </a>

          {/* Mute Toggle Button */}
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