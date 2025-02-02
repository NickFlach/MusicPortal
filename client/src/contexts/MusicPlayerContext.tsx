import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getFromIPFS } from "@/lib/ipfs";

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
  volume: number;
  audioUrl: string;
  playSong: (song: Song) => void;
  playNext: () => void;
  playPrevious: () => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  recentSongs?: Song[];
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [audioUrl, setAudioUrl] = useState('');
  const queryClient = useQueryClient();

  // Always fetch recent songs with landing page token
  const { data: recentSongs } = useQuery<Song[]>({
    queryKey: ["/api/songs/recent"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/songs/recent", {
        method: "GET",
        headers: {
          'X-Internal-Token': 'landing-page'
        }
      });
      return response.json();
    },
    enabled: true
  });

  // Initialize music on first load
  useEffect(() => {
    async function initializeMusic() {
      if (!currentSong && recentSongs?.length) {
        console.log('Initializing music with first song:', recentSongs[0].title);
        await playSong(recentSongs[0]);
      }
    }
    initializeMusic();
  }, [recentSongs]);

  // Track play count
  const playMutation = useMutation({
    mutationFn: async (songId: number) => {
      await apiRequest("POST", `/api/songs/play/${songId}`, {
        method: "POST",
        headers: {
          'X-Internal-Token': 'landing-page'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/recent"] });
    },
  });

  const playNext = () => {
    if (!recentSongs?.length || !currentSong) return;

    const currentIndex = recentSongs.findIndex((s) => s.id === currentSong.id);
    if (currentIndex === -1) return;

    const nextSong = recentSongs[(currentIndex + 1) % recentSongs.length];
    if (nextSong) {
      playSong(nextSong);
    }
  };

  const playPrevious = () => {
    if (!recentSongs?.length || !currentSong) return;

    const currentIndex = recentSongs.findIndex((s) => s.id === currentSong.id);
    if (currentIndex === -1) return;

    const prevSong = recentSongs[(currentIndex - 1 + recentSongs.length) % recentSongs.length];
    if (prevSong) {
      playSong(prevSong);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const loadSong = async (songToLoad: Song) => {
    if (!songToLoad) return;

    try {
      console.log('Loading song:', songToLoad.title);
      const audioData = await getFromIPFS(songToLoad.ipfsHash);
      const blob = new Blob([audioData], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error loading song:', error);
      setIsPlaying(false);
    }
  };

  const playSong = async (song: Song) => {
    console.log('Playing song:', song.title);
    setCurrentSong(song);
    await loadSong(song);
    await playMutation.mutate(song.id);
  };

  // Clean up object URLs when component unmounts or song changes
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <MusicPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        volume,
        audioUrl,
        playSong,
        playNext,
        playPrevious,
        togglePlay,
        setVolume,
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