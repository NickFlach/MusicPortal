import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getFromIPFS } from "@/lib/ipfs";
import { useAccount } from 'wagmi';
import { useLocation } from 'wouter';

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
  duration: number;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  playSong: (song: Song) => void;
  playNext: () => void;
  playPrevious: () => void;
  togglePlay: () => void;
  toggleMute: () => void;
  handleSeek: (value: number[]) => void;
  handleVolumeChange: (value: number[]) => void;
  recentSongs?: Song[];
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

// Create a single audio instance that will be shared across the entire app
const globalAudio = new Audio();
globalAudio.preload = 'auto';

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(globalAudio);
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const [location] = useLocation();

  // Fetch recent songs regardless of wallet connection
  const { data: recentSongs } = useQuery<Song[]>({
    queryKey: ["/api/songs/recent"],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (!address && location === '/') {
        headers['X-Internal-Token'] = 'landing-page';
      }
      const response = await apiRequest("GET", "/api/songs/recent", undefined, { headers });
      return response.json();
    },
    enabled: true // Always enabled
  });

  // When wallet connects, register the user and update play count if there's a current song
  useEffect(() => {
    async function handleWalletConnection() {
      if (address && currentSong) {
        try {
          // Register user first
          await apiRequest("POST", "/api/users/register", { address });
          // Update play count for current song
          await apiRequest("POST", `/api/songs/play/${currentSong.id}`);
          // Refresh recent songs list
          queryClient.invalidateQueries({ queryKey: ["/api/songs/recent"] });
        } catch (error) {
          console.error('Error handling wallet connection:', error);
        }
      }
    }

    handleWalletConnection();
  }, [address, currentSong]);


  // Track play mutation - only used when wallet is connected
  const playMutation = useMutation({
    mutationFn: async (songId: number) => {
      if (!address) return; // Skip if no wallet connected
      await apiRequest("POST", `/api/songs/play/${songId}`, undefined, {
        headers: address ? {} : { 'X-Internal-Token': 'landing-page' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/recent"] });
    },
  });

  // Define which pages should have music playback enabled
  const isAllowedPage = ["/", "/home", "/treasury", "/admin"].includes(location);

  const playNext = useCallback(() => {
    if (!recentSongs?.length || !currentSong) return;

    const currentIndex = recentSongs.findIndex((s) => s.id === currentSong.id);
    if (currentIndex === -1) return;

    const nextSong = recentSongs[(currentIndex + 1) % recentSongs.length];
    if (nextSong) {
      playSong(nextSong);
    }
  }, [currentSong, recentSongs]);

  const playPrevious = useCallback(() => {
    if (!recentSongs?.length || !currentSong) return;

    const currentIndex = recentSongs.findIndex((s) => s.id === currentSong.id);
    if (currentIndex === -1) return;

    const prevSong = recentSongs[(currentIndex - 1 + recentSongs.length) % recentSongs.length];
    if (prevSong) {
      playSong(prevSong);
    }
  }, [currentSong, recentSongs]);

  // Initialize audio event listeners
  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      playNext();
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // Set initial volume
    audio.volume = volume;

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [playNext, volume]);

  const loadSong = async (songToLoad: Song) => {
    if (!songToLoad) return;

    try {
      console.log('Loading song:', songToLoad.title);
      const audioData = await getFromIPFS(songToLoad.ipfsHash);
      const blob = new Blob([audioData], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      audioRef.current.src = url;
      audioRef.current.load();

      if (isPlaying && isAllowedPage) {
        try {
          await audioRef.current.play();
        } catch (error) {
          console.error('Failed to play:', error);
          setIsPlaying(false);
        }
      }
    } catch (error) {
      console.error('Error loading song:', error);
      setIsPlaying(false);
    }
  };

  // Load song when current song changes
  useEffect(() => {
    if (currentSong) {
      loadSong(currentSong);
    }
  }, [currentSong]);

  const togglePlay = async () => {
    if (!currentSong) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Error toggling play state:', error);
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const playSong = async (song: Song) => {
    if (!isAllowedPage) return;

    console.log('Playing song:', song.title);
    setCurrentSong(song);
    setIsPlaying(true);

    // Only track plays when wallet is connected
    if (address) {
      await playMutation.mutate(song.id);
    }
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        duration,
        currentTime,
        volume,
        isMuted,
        playSong,
        playNext,
        playPrevious,
        togglePlay,
        toggleMute,
        handleSeek,
        handleVolumeChange,
        recentSongs,
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