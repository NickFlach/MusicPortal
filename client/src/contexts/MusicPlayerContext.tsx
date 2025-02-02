import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { getFromIPFS } from "@/lib/ipfs";
import { useAccount } from 'wagmi';

interface Song {
  id: number;
  title: string;
  artist: string;
  ipfsHash: string;
  uploadedBy: string | null;
  createdAt: string | null;
  votes: number | null;
}

interface MusicPlayerContextType {
  currentSong: Song | undefined;
  isPlaying: boolean;
  togglePlay: () => void;
  recentSongs?: Song[];
  isLandingPage: boolean;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song>();
  const [isPlaying, setIsPlaying] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { address } = useAccount();
  const isLandingPage = !address;

  // Fetch initial song list
  const { data: recentSongs } = useQuery<Song[]>({
    queryKey: ["/api/songs/recent"],
    queryFn: async () => {
      const response = await fetch("/api/songs/recent", {
        headers: {
          'X-Internal-Token': 'landing-page'
        }
      });
      return response.json();
    }
  });

  // Initialize music once on load - only if we're on landing page
  useEffect(() => {
    async function initializeMusic() {
      // Only initialize if:
      // 1. We have songs
      // 2. Audio isn't already set up
      // 3. We're on landing page OR we have a wallet connected
      if (!recentSongs?.length || audioRef.current?.src) return;

      try {
        const firstSong = recentSongs[0];
        console.log('Initializing music with:', firstSong.title);

        const audioData = await getFromIPFS(firstSong.ipfsHash);
        const blob = new Blob([audioData], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);

        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.load();
          audioRef.current.play().catch(console.error);
          setCurrentSong(firstSong);
        }
      } catch (error) {
        console.error('Error initializing music:', error);
      }
    }

    if (isLandingPage) {
      initializeMusic();
    }
  }, [recentSongs, isLandingPage]);

  // Simple volume toggle for landing page
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (audioRef.current) {
      audioRef.current.volume = !isPlaying ? 1 : 0;
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current?.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  return (
    <MusicPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        togglePlay,
        recentSongs,
        isLandingPage
      }}
    >
      {/* Only render audio element on landing page */}
      {isLandingPage && (
        <audio
          ref={audioRef}
          loop
          preload="auto"
          onError={(e) => console.error('Audio error:', e)}
        />
      )}
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
  }
  return context;
}