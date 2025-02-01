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

  const { data: recentSongs } = useQuery<Song[]>({
    queryKey: ["/api/songs/recent"],
  });

  const playMutation = useMutation({
    mutationFn: async (songId: number) => {
      await apiRequest("POST", `/api/songs/play/${songId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/recent"] });
    },
  });

  // Check if current page is one where music should play
  const isAllowedPage = ["/", "/treasury", "/admin", "/landing"].includes(location);

  // Define playNext as a useCallback to ensure stable reference
  const playNext = useCallback(() => {
    if (!isAllowedPage) return;

    if (!recentSongs?.length || !currentSong) {
      if (recentSongs?.length) {
        // If no current song but we have recent songs, play the first one
        playSong(recentSongs[0]);
      }
      return;
    }

    const currentIndex = recentSongs.findIndex((s) => s.id === currentSong.id);
    const nextSong = recentSongs[(currentIndex + 1) % recentSongs.length];
    playSong(nextSong);
  }, [currentSong, recentSongs, isAllowedPage]);

  const playPrevious = useCallback(() => {
    if (!isAllowedPage) return;

    if (!recentSongs?.length || !currentSong) return;
    const currentIndex = recentSongs.findIndex((s) => s.id === currentSong.id);
    const prevSong = recentSongs[(currentIndex - 1 + recentSongs.length) % recentSongs.length];
    playSong(prevSong);
  }, [currentSong, recentSongs, isAllowedPage]);

  // Auto-start playing the most recent song when on landing page
  useEffect(() => {
    if (location === '/landing' && recentSongs?.length && !currentSong) {
      playSong(recentSongs[0]);
    }
  }, [location, recentSongs, currentSong]);

  useEffect(() => {
    const audio = audioRef.current;

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
    audio.volume = volume;

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playNext, volume]);

  // Handle page transitions while maintaining playback state
  useEffect(() => {
    if (!isAllowedPage) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isAllowedPage]);

  const loadSong = async () => {
    if (!currentSong) return;
    try {
      const audioData = await getFromIPFS(currentSong.ipfsHash);
      const blob = new Blob([audioData], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      // Store current playback state
      const wasPlaying = !audioRef.current.paused;
      const currentTime = audioRef.current.currentTime;

      // Update source
      audioRef.current.src = url;
      audioRef.current.load();

      // Restore playback state
      if (wasPlaying && isAllowedPage) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Failed to resume playback:', error);
          setIsPlaying(false);
        }
      }

      // Restore time position if we were in the middle of the song
      if (currentTime > 0) {
        audioRef.current.currentTime = currentTime;
      }
    } catch (error) {
      console.error('Error loading song:', error);
    }
  };

  useEffect(() => {
    if (currentSong) {
      loadSong();
    }
  }, [currentSong]);

  const togglePlay = () => {
    if (!isAllowedPage) return;

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (value: number[]) => {
    if (!isAllowedPage) return;

    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (!isAllowedPage) return;

    const newVolume = value[0];
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const playSong = async (song: Song) => {
    if (!isAllowedPage) return;

    setCurrentSong(song);
    setIsPlaying(true);
    await playMutation.mutate(song.id);
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