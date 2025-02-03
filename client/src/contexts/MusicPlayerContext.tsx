import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
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

type PlaylistContext = 'landing' | 'library' | 'feed';

interface MusicPlayerContextType {
  currentSong: Song | undefined;
  isPlaying: boolean;
  togglePlay: () => void;
  playSong: (song: Song, context?: PlaylistContext) => Promise<void>;
  recentSongs?: Song[];
  isLandingPage: boolean;
  currentContext: PlaylistContext;
  isLoading: boolean;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentContext, setCurrentContext] = useState<PlaylistContext>('landing');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { address } = useAccount();
  const isLandingPage = !address;

  const { data: recentSongs } = useQuery<Song[]>({
    queryKey: ["/api/songs/recent"],
    queryFn: async () => {
      try {
        const headers: Record<string, string> = {
          'X-Internal-Token': 'landing-page'
        };

        if (address) {
          headers['X-Wallet-Address'] = address;
        }

        const response = await fetch("/api/songs/recent", {
          headers
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch recent songs: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Recent songs loaded:', data.length, 'songs');
        return data;
      } catch (error) {
        console.error('Error fetching recent songs:', error);
        return [];
      }
    },
    refetchInterval: isLandingPage ? 30000 : false,
  });

  const getNextSong = (currentSongId: number): Song | undefined => {
    if (!recentSongs?.length) return undefined;

    const currentIndex = recentSongs.findIndex(song => song.id === currentSongId);
    if (currentIndex === -1) return recentSongs[0];

    return recentSongs[(currentIndex + 1) % recentSongs.length];
  };

  useEffect(() => {
    if (!address) {
      setCurrentContext('landing');
    }
  }, [address]);

  const cleanup = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load();
    }
  };

  const playSong = async (song: Song, context?: PlaylistContext) => {
    try {
      setIsLoading(true);
      cleanup();

      if (context) {
        setCurrentContext(context);
      }

      // Use our backend radio service instead of direct IPFS access
      const audioUrl = `/api/radio/stream/${song.ipfsHash}`;

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      // Set up event handlers
      const setupAudio = () => {
        if (!audioRef.current) return Promise.reject(new Error('No audio element'));

        return new Promise((resolve, reject) => {
          const onCanPlay = () => {
            audioRef.current?.removeEventListener('canplay', onCanPlay);
            audioRef.current?.removeEventListener('error', onError);
            resolve(undefined);
          };

          const onError = () => {
            const error = audioRef.current?.error;
            audioRef.current?.removeEventListener('canplay', onCanPlay);
            audioRef.current?.removeEventListener('error', onError);
            reject(new Error(error?.message || 'Failed to load audio'));
          };

          audioRef.current.addEventListener('canplay', onCanPlay);
          audioRef.current.addEventListener('error', onError);
        });
      };

      // Set up ended event listener
      audioRef.current.onended = async () => {
        const nextSong = getNextSong(song.id);
        if (nextSong) {
          await playSong(nextSong, currentContext);
        }
      };

      // Load and play
      audioRef.current.src = audioUrl;
      audioRef.current.load();

      await setupAudio();
      await audioRef.current.play();

      setIsPlaying(true);
      setCurrentSong(song);
      console.log('Audio playback started successfully');

    } catch (error) {
      console.error('Error playing song:', error);
      setIsPlaying(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling play:', error);
      setIsPlaying(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  return (
    <MusicPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        togglePlay,
        playSong,
        recentSongs,
        isLandingPage,
        currentContext,
        isLoading
      }}
    >
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