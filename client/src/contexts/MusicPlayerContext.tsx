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
  playNext: () => void;
  setVolume: (volume: number) => void;
  recentSongs?: Song[];
  playSong: (song: Song) => Promise<void>;
  isPlayerVisible: boolean;
  togglePlayer: () => void;
  togglePlayPause: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [audioUrl, setAudioUrl] = useState('');
  const [isPlayerVisible, setIsPlayerVisible] = useState(true);

  const { data: recentSongs } = useQuery<Song[]>({
    queryKey: ["/api/songs/recent"],
  });

  const playNext = () => {
    if (!recentSongs?.length) return;

    const currentIndex = currentSong
      ? recentSongs.findIndex(s => s.id === currentSong.id)
      : -1;

    const nextSong = recentSongs[(currentIndex + 1) % recentSongs.length];
    if (nextSong) {
      playSong(nextSong).catch(error => {
        console.error('Error playing next song:', error);
      });
    }
  };

  const playSong = async (song: Song) => {
    try {
      // Clean up previous audio URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl('');
      }

      const audioData = await getFromIPFS(song.ipfsHash);
      if (!audioData || audioData.length === 0) {
        throw new Error('Failed to fetch audio data from IPFS');
      }

      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      setCurrentSong(song);
      setAudioUrl(url);
      setIsPlayerVisible(true);
      setIsPlaying(true);

      // Update play count
      try {
        await fetch(`/api/songs/play/${song.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
      } catch (error) {
        console.error('Error updating play count:', error);
      }
    } catch (error) {
      console.error('Error playing song:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to play song');
    }
  };

  const togglePlayer = () => {
    setIsPlayerVisible(prev => !prev);
  };

  const togglePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  // Cleanup on unmount
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
        playNext,
        setVolume,
        recentSongs,
        playSong,
        isPlayerVisible,
        togglePlayer,
        togglePlayPause,
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