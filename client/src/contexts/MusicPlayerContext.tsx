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
    if (location === '/landing' && recentSongs?.length) {
      const initialSong = recentSongs[0];
      // Set the song and trigger play mutation
      setCurrentSong(initialSong);
      playMutation.mutate(initialSong.id);

      // Ensure audio is ready to play
      const loadAndPlay = async () => {
        try {
          const audioData = await getFromIPFS(initialSong.ipfsHash);
          const blob = new Blob([audioData], { type: 'audio/mp3' });
          const url = URL.createObjectURL(blob);

          audioRef.current.src = url;
          audioRef.current.load();
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Failed to autoplay:', error);
          setIsPlaying(false);
        }
      };

      loadAndPlay();
    }
  }, [location, recentSongs]);

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
      const audioData = await getFromIPFS(songToLoad.ipfsHash);
      const blob = new Blob([audioData], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      audioRef.current.src = url;
      audioRef.current.load();

      if (isPlaying && isAllowedPage) {
        try {
          await audioRef.current.play();
        } catch (error) {
          console.error('Failed to start playback:', error);
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
    if (!isAllowedPage || !currentSong) return;

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