import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
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
  playSong: (song: Song) => Promise<void>;
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
  const [volume, setVolume] = useState(0.7);
  const [audioUrl, setAudioUrl] = useState('');

  // Fetch recent songs without any dependencies
  const { data: recentSongs } = useQuery<Song[]>({
    queryKey: ["/api/songs/recent"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/songs/recent", {
          headers: {
            'X-Internal-Token': 'landing-page'
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch recent songs');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching recent songs:', error);
        return [];
      }
    },
    staleTime: 30000
  });

  // Auto-play first song when songs are loaded
  useEffect(() => {
    const autoPlayFirstSong = async () => {
      if (recentSongs?.length && !currentSong) {
        try {
          console.log('Auto-playing first song:', recentSongs[0].title);
          await playSong(recentSongs[0]);
        } catch (error) {
          console.error('Error auto-playing first song:', error);
        }
      }
    };

    autoPlayFirstSong();
  }, [recentSongs]);

  const playNext = () => {
    if (!recentSongs?.length) return;

    const currentIndex = currentSong 
      ? recentSongs.findIndex(s => s.id === currentSong.id)
      : -1;

    const nextSong = recentSongs[(currentIndex + 1) % recentSongs.length];
    if (nextSong) {
      playSong(nextSong).catch(console.error);
    }
  };

  const playPrevious = () => {
    if (!recentSongs?.length) return;

    const currentIndex = currentSong 
      ? recentSongs.findIndex(s => s.id === currentSong.id)
      : 0;

    const prevIndex = (currentIndex - 1 + recentSongs.length) % recentSongs.length;
    const prevSong = recentSongs[prevIndex];

    if (prevSong) {
      playSong(prevSong).catch(console.error);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const playSong = async (song: Song) => {
    try {
      // Clean up previous audio URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      console.log('Loading song:', song.title);
      const audioData = await getFromIPFS(song.ipfsHash);
      if (!audioData) {
        throw new Error('Failed to fetch audio data');
      }

      const blob = new Blob([audioData], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      setAudioUrl(url);
      setCurrentSong(song);
      setIsPlaying(true);

      // Update play count (non-blocking)
      fetch(`/api/songs/play/${song.id}`, {
        method: 'POST',
        headers: {
          'X-Internal-Token': 'landing-page'
        }
      }).catch(error => {
        console.error('Error updating play count:', error);
      });
    } catch (error) {
      console.error('Error playing song:', error);
      setIsPlaying(false);
      throw error;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

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