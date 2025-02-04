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

type PlaylistContext = 'landing' | 'library' | 'feed';

interface MusicPlayerContextType {
  currentSong: Song | undefined;
  isPlaying: boolean;
  togglePlay: () => void;
  playSong: (song: Song, context?: PlaylistContext) => Promise<void>;
  recentSongs?: Song[];
  isLandingPage: boolean;
  currentContext: PlaylistContext;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentContext, setCurrentContext] = useState<PlaylistContext>('landing');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { address: userAddress } = useAccount();
  const defaultWallet = "0xB41C12E86EE878c918c38Ae5a7E08AA5509B2085";
  const landingAddress = userAddress || defaultWallet;
  const isLandingPage = !userAddress;

  // Fetch landing page feed (recent songs)
  const { data: recentSongs } = useQuery<Song[]>({
    queryKey: ["/api/songs/recent"],
    queryFn: async () => {
      try {
        const headers: Record<string, string> = {
          'X-Internal-Token': 'landing-page'
        };

        // Add wallet address header if available
        if (landingAddress) {
          headers['X-Wallet-Address'] = landingAddress;
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
        return []; // Return empty array on error to prevent undefined issues
      }
    },
    refetchInterval: isLandingPage ? 30000 : false, // Refetch every 30s on landing page
  });

  // Function to get next song in the current context
  const getNextSong = (currentSongId: number): Song | undefined => {
    if (!recentSongs?.length) return undefined;

    const currentIndex = recentSongs.findIndex(song => song.id === currentSongId);
    if (currentIndex === -1) return recentSongs[0];

    // Get next song, or loop back to the beginning
    return recentSongs[(currentIndex + 1) % recentSongs.length];
  };

  // Reset to landing context when wallet disconnects
  useEffect(() => {
    if (!userAddress) {
      setCurrentContext('landing');
    }
  }, [userAddress]);

  // Initialize music once on load - only if we're on landing page
  useEffect(() => {
    async function initializeMusic() {
      if (!recentSongs?.length || audioRef.current?.src) return;

      try {
        const firstSong = recentSongs[0];
        console.log('Initializing music with:', firstSong.title);

        // Create audio context to handle autoplay
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext();

        // Try to resume audio context (required for autoplay)
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        await playSong(firstSong, 'landing');

        // Handle autoplay failure
        if (audioRef.current) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.log('Autoplay prevented:', error);
              setIsPlaying(false);
            });
          }
        }
      } catch (error) {
        console.error('Error initializing music:', error);
        setIsPlaying(false);
      }
    }

    if (isLandingPage) {
      initializeMusic();
    }
  }, [recentSongs, isLandingPage]);

  const playSong = async (song: Song, context?: PlaylistContext) => {
    try {
      // Cancel any existing fetch request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      // Update context if provided
      if (context) {
        setCurrentContext(context);
      }

      // Get approximate location if available (optional)
      let geoData: { latitude?: number; longitude?: number } = {};
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('not_supported'));
            return;
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false, // Less precise location
            timeout: 3000,
            maximumAge: 300000 // Cache location for 5 minutes
          });
        });

        // Round coordinates to 1 decimal place for less precision
        geoData = {
          latitude: Math.round(position.coords.latitude * 10) / 10,
          longitude: Math.round(position.coords.longitude * 10) / 10
        };
      } catch (error) {
        // Silently continue without location
        console.debug('Location not available');
      }

      // Record play with optional location data
      try {
        await fetch(`/api/songs/play/${song.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userAddress && { 'X-Wallet-Address': userAddress })
          },
          body: JSON.stringify(geoData)
        });
      } catch (error) {
        console.error('Error recording play:', error);
      }

      // Clean up old audio element completely
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        audioRef.current = null;
      }

      console.log('Fetching from IPFS gateway:', song.ipfsHash);
      const audioData = await getFromIPFS(song.ipfsHash);

      const blob = new Blob([audioData], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      // Create new audio element
      const newAudio = new Audio();

      // Set up event handlers before setting src
      newAudio.addEventListener('error', (event) => {
        const error = event.currentTarget as HTMLAudioElement;
        console.error('Audio playback error:', error.error?.message || 'Unknown error');
        setIsPlaying(false);
      });

      newAudio.addEventListener('loadeddata', () => {
        console.log('Audio data loaded successfully');
      });

      // Add ended event listener to play next song
      newAudio.addEventListener('ended', async () => {
        console.log('Song ended, playing next song');
        const nextSong = getNextSong(song.id);
        if (nextSong) {
          await playSong(nextSong, currentContext);
        }
      });

      // Set source and load
      newAudio.src = url;
      await new Promise((resolve, reject) => {
        newAudio.addEventListener('loadeddata', resolve);
        newAudio.addEventListener('error', reject);
        newAudio.load();
      });

      audioRef.current = newAudio;
      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
          setCurrentSong(song);
          console.log('IPFS fetch and playback successful');
        }).catch(error => {
          console.error('Playback prevented:', error);
          setIsPlaying(false);
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('IPFS fetch aborted');
        return;
      }
      console.error('Error playing song:', error);
      setIsPlaying(false);
      throw error;
    } finally {
      abortControllerRef.current = null;
    }
  };

  // Simple volume toggle for landing page
  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          audioRef.current.volume = 1;
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('Error toggling play:', error);
      setIsPlaying(false);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        if (audioRef.current.src) {
          URL.revokeObjectURL(audioRef.current.src);
        }
      }
    };
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
        audioRef
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