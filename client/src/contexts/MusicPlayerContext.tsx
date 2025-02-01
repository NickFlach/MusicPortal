import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getFromIPFS } from "@/lib/ipfs";
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
  playSong: (song: Song) => void;
  playNext: () => void;
  playPrevious: () => void;
  togglePlay: () => void;
  handleSeek: (value: number[]) => void;
  handleVolumeChange: (value: number[]) => void;
  recentSongs?: Song[];
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const queryClient = useQueryClient();
  const [location] = useLocation();

  // Check for wallet connection
  const [walletConnected, setWalletConnected] = useState(false);

  useEffect(() => {
    const checkWallet = () => {
      const isConnected = window.ethereum && window.ethereum.selectedAddress;
      setWalletConnected(!!isConnected);
    };

    checkWallet();
    window.ethereum?.on('accountsChanged', checkWallet);

    return () => {
      window.ethereum?.removeListener('accountsChanged', checkWallet);
    };
  }, []);

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
  const isAllowedPage = ["/", "/treasury", "/admin"].includes(location);

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

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Stop playback when wallet disconnects or navigating away from allowed pages
  useEffect(() => {
    if (!walletConnected || !isAllowedPage) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [walletConnected, isAllowedPage]);

  useEffect(() => {
    if (currentSong) {
      loadSong();
    }
  }, [currentSong]);

  const loadSong = async () => {
    if (!currentSong) return;
    try {
      const audioData = await getFromIPFS(currentSong.ipfsHash);
      const blob = new Blob([audioData], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      audioRef.current.src = url;
      audioRef.current.load();
      if (isPlaying && walletConnected && isAllowedPage) {
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Error loading song:', error);
    }
  };

  const togglePlay = () => {
    if (!walletConnected || !isAllowedPage) return;

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (value: number[]) => {
    if (!walletConnected || !isAllowedPage) return;

    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (!walletConnected || !isAllowedPage) return;

    const newVolume = value[0];
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const playSong = async (song: Song) => {
    if (!walletConnected || !isAllowedPage) return;

    setCurrentSong(song);
    setIsPlaying(true);
    await playMutation.mutate(song.id);
  };

  const playNext = () => {
    if (!walletConnected || !isAllowedPage) return;

    if (!recentSongs || !currentSong) return;
    const currentIndex = recentSongs.findIndex((s) => s.id === currentSong.id);
    const nextSong = recentSongs[(currentIndex + 1) % recentSongs.length];
    playSong(nextSong);
  };

  const playPrevious = () => {
    if (!walletConnected || !isAllowedPage) return;

    if (!recentSongs || !currentSong) return;
    const currentIndex = recentSongs.findIndex((s) => s.id === currentSong.id);
    const prevSong = recentSongs[(currentIndex - 1 + recentSongs.length) % recentSongs.length];
    playSong(prevSong);
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        duration,
        currentTime,
        volume,
        playSong,
        playNext,
        playPrevious,
        togglePlay,
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