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
      console.log('Starting to play song:', song.title);
      console.log('Fetching from IPFS gateway:', song.ipfsHash);

      // Clean up previous audio URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl('');
      }

      const audioData = await getFromIPFS(song.ipfsHash);
      if (!audioData || audioData.length === 0) {
        throw new Error('Failed to fetch audio data from IPFS');
      }

      console.log('Creating blob for song:', song.title);
      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      // Set the current song first
      setCurrentSong(song);
      // Then set the audio URL
      setAudioUrl(url);
      // Make player visible and start playing
      setIsPlayerVisible(true);
      setIsPlaying(true);

      // Update play count
      try {
        await fetch(`/api/songs/play/${song.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': 'landing-page'
          }
        });
      } catch (error) {
        console.error('Error updating play count:', error);
      }

      console.log('Song setup complete:', song.title);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error playing song:', errorMessage);
      throw new Error(`Playback failed: ${errorMessage}`);
    }
  };

  const togglePlayer = () => {
    console.log('Toggling player visibility from:', isPlayerVisible, 'to:', !isPlayerVisible);
    if (isPlayerVisible) {
      // If we're hiding the player, pause playback
      setIsPlaying(false);
      setIsPlayerVisible(false);
    } else {
      // If we're showing the player
      setIsPlayerVisible(true);
      // Only auto-play if there's a current song
      if (currentSong) {
        setIsPlaying(true);
      }
    }
  };

  const togglePlayPause = () => {
    console.log('Toggling play/pause:', !isPlaying);
    setIsPlaying(!isPlaying);
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