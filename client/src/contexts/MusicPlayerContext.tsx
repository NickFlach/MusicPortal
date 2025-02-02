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
  const [volume, setVolume] = useState(() => {
    // Try to restore volume from localStorage
    const savedVolume = localStorage.getItem('musicPlayerVolume');
    return savedVolume ? parseFloat(savedVolume) : 0.7;
  });
  const [audioUrl, setAudioUrl] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Always fetch recent songs with landing page token
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
    staleTime: 30000, // Cache for 30 seconds
    retry: 3
  });

  // Save volume to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('musicPlayerVolume', volume.toString());
  }, [volume]);

  // Initialize music on first load
  useEffect(() => {
    let mounted = true;

    async function initializeMusic() {
      if (!isInitialized && recentSongs?.length && mounted) {
        console.log('Initializing music with first song:', recentSongs[0].title);
        try {
          await playSong(recentSongs[0]);
          setIsInitialized(true);
        } catch (error) {
          console.error('Error initializing music:', error);
        }
      }
    }

    initializeMusic();

    return () => {
      mounted = false;
    };
  }, [recentSongs, isInitialized]);

  const playNext = () => {
    if (!recentSongs?.length) return;

    const currentIndex = currentSong 
      ? recentSongs.findIndex((s) => s.id === currentSong.id)
      : -1;

    const nextIndex = (currentIndex + 1) % recentSongs.length;
    const nextSong = recentSongs[nextIndex];

    if (nextSong) {
      playSong(nextSong).catch(console.error);
    }
  };

  const playPrevious = () => {
    if (!recentSongs?.length) return;

    const currentIndex = currentSong 
      ? recentSongs.findIndex((s) => s.id === currentSong.id)
      : -1;

    const prevIndex = currentIndex === -1 
      ? recentSongs.length - 1 
      : (currentIndex - 1 + recentSongs.length) % recentSongs.length;

    const prevSong = recentSongs[prevIndex];

    if (prevSong) {
      playSong(prevSong).catch(console.error);
    }
  };

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const loadSong = async (songToLoad: Song): Promise<string> => {
    if (!songToLoad?.ipfsHash) {
      throw new Error('Invalid song data');
    }

    try {
      console.log('Loading song:', songToLoad.title);
      const audioData = await getFromIPFS(songToLoad.ipfsHash);
      if (!audioData) {
        throw new Error('Failed to fetch audio data from IPFS');
      }

      const blob = new Blob([audioData], { type: 'audio/mp3' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error loading song:', error);
      throw error;
    }
  };

  const playSong = async (song: Song) => {
    try {
      // Clean up previous audio URL before creating a new one
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      const newAudioUrl = await loadSong(song);
      setAudioUrl(newAudioUrl);
      setCurrentSong(song);
      setIsPlaying(true);

      // Update play count
      try {
        await fetch(`/api/songs/play/${song.id}`, {
          method: 'POST',
          headers: {
            'X-Internal-Token': 'landing-page'
          }
        });
      } catch (error) {
        // Non-critical error, just log it
        console.error('Error updating play count:', error);
      }
    } catch (error) {
      console.error('Error playing song:', error);
      setIsPlaying(false);
      // Re-throw to allow handling by caller
      throw error;
    }
  };

  // Clean up object URLs when component unmounts
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