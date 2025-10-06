import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { playlistManager } from "@/lib/playlist";
import { useAccount } from 'wagmi';
import { getFileBuffer } from '@/lib/storage';

interface Track {
  id: number;
  ipfsHash: string;
  title: string;
  artist: string;
}

interface MusicPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  togglePlay: () => Promise<void>;
  playTrack: (track: Track) => Promise<void>;
  playlist: Track[];
  hasInteracted: boolean;
  recentTracks: Track[];
  currentlyLoadingId: number | null;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [currentlyLoadingId, setCurrentlyLoadingId] = useState<number | null>(null); // Track currently loading ID
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { address } = useAccount();

  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        console.log('Audio context initialized');
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
        setError('Failed to initialize audio system');
      }
    }
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;

      const handleCanPlay = () => {
        console.log('Audio can play');
        setIsLoading(false);
        setError(null);
        if (isPlaying) {
          audio.play().catch(error => {
            console.error('Error auto-playing after load:', error);
            setIsPlaying(false);
            setError('Failed to start playback');
          });
        }
      };

      const handleError = (error: ErrorEvent) => {
        console.error('Audio error:', error);
        setIsPlaying(false);
        setIsLoading(false);
        setError('Error playing audio');
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('error', handleError);
      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));
      const handleEnded = async () => {
        setIsPlaying(false);
        if (audioRef.current?.src) {
          URL.revokeObjectURL(audioRef.current.src);
          audioRef.current.src = '';
        }
        // Auto-advance to next track
        await handleTrackEnd();
        audio.removeEventListener('pause', () => setIsPlaying(false));
        audio.removeEventListener('ended', () => setIsPlaying(false));

        if (audio.src) {
          URL.revokeObjectURL(audio.src);
        }
        audio.pause();
      };
    }
  }, [isPlaying]);

  // Auto-advance to next track when current ends
  const handleTrackEnd = async () => {
    if (!autoPlayEnabled || recentTracks.length === 0) return;
    
    // Find current track index
    const currentIndex = recentTracks.findIndex(t => t.id === currentTrack?.id);
    if (currentIndex === -1) {
      // Current track not in recent tracks, play first real track
      const nextTrack = recentTracks.find(t => t.ipfsHash && t.ipfsHash !== '');
      if (nextTrack && playTrackRef.current) {
        console.log('🎵 Auto-playing first real track:', nextTrack.title);
        await playTrackRef.current(nextTrack);
      }
      return;
    }
    
    // Find next track with valid IPFS hash (skip NULL_ISLAND)
    let nextIndex = (currentIndex + 1) % recentTracks.length;
    let attempts = 0;
    const maxAttempts = recentTracks.length;
    
    while (attempts < maxAttempts) {
      const nextTrack = recentTracks[nextIndex];
      if (nextTrack && nextTrack.ipfsHash && nextTrack.ipfsHash !== '' && playTrackRef.current) {
        console.log('🎵 Auto-advancing to:', nextTrack.title);
        await playTrackRef.current(nextTrack);
        return;
      }
      nextIndex = (nextIndex + 1) % recentTracks.length;
      attempts++;
    }
    
    console.log('⚠️ No playable tracks found in queue');
  };

  // Track currently being loaded to prevent double-loading
  const loadingTrackRef = useRef<number | null>(null);

  const playTrack = async (track: Track) => {
    console.log('Playing track:', track);
    setError(null);

    // Prevent double-click race condition - using both ref and state
    // The ref is for internal function use, state is for UI feedback
    if (loadingTrackRef.current === track.id || currentlyLoadingId === track.id) {
      console.log('Already loading this track, ignoring duplicate request');
      return;
    }
    
    // Set loading state for this track (both ref and state)
    loadingTrackRef.current = track.id;
    setCurrentlyLoadingId(track.id);
    setIsLoading(true);

    if (!hasInteracted) {
      await initializeAudio();
    }

    if (!audioRef.current) {
      console.error('Audio element not ready');
      setError('Audio system not ready');
      loadingTrackRef.current = null;
      setCurrentlyLoadingId(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Clean up previous track
      if (audioRef.current.src) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      setCurrentTrack(track);

      // Resume audio context if suspended
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Handle the case of null or empty ipfsHash - use silent audio for system tracks
      if (!track.ipfsHash) {
        console.log('Track has no IPFS hash, using silent audio fallback');
        
        // Create a short silent audio buffer
        const audioContext = audioContextRef.current;
        if (!audioContext) {
          throw new Error('Audio context not initialized');
        }
        
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(2, sampleRate * 2, sampleRate); // 2 seconds of silence
        
        // Create a temporary audio file from buffer
        const silentSource = audioContext.createBufferSource();
        silentSource.buffer = buffer;
        
        // Create an offline context to render the buffer to an array buffer
        const offlineContext = new OfflineAudioContext(2, sampleRate * 2, sampleRate);
        const offlineSource = offlineContext.createBufferSource();
        offlineSource.buffer = buffer;
        offlineSource.connect(offlineContext.destination);
        offlineSource.start(0);
        
        // Render and use the output
        const renderedBuffer = await offlineContext.startRendering();
        
        // Convert AudioBuffer to ArrayBuffer
        const audioData = new ArrayBuffer(renderedBuffer.length * 4); // 4 bytes per float32
        const view = new Float32Array(audioData);
        for (let channel = 0; channel < renderedBuffer.numberOfChannels; channel++) {
          const channelData = renderedBuffer.getChannelData(channel);
          for (let i = 0; i < channelData.length; i++) {
            view[i * renderedBuffer.numberOfChannels + channel] = channelData[i];
          }
        }
        
        // If another track was requested while this one was loading, abort
        if (loadingTrackRef.current !== track.id) {
          console.log('Another track was requested, aborting this playback');
          return;
        }
        
        // Create blob and URL for the silent audio
        const blob = new Blob([audioData], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        console.log('Loading silent audio for system track');
        
        // Load and play
        audioRef.current.src = url;
        await audioRef.current.load();
        // Don't auto-play silent tracks, just set loaded state
        
        setIsPlaying(false);
        setError(null);
        
        // Clear loading state
        loadingTrackRef.current = null;
        setCurrentlyLoadingId(null);
        setIsLoading(false);
        
        // Update recent tracks
        setRecentTracks(prev => {
          const newTracks = prev.filter(t => t.id !== track.id);
          return [track, ...newTracks].slice(0, 10);
        });
        
        return;
      }

      console.log('Fetching audio data for track:', track.ipfsHash);

      // Get audio data from IPFS
      const audioData = await getFileBuffer(track.ipfsHash);

      if (!audioData) {
        throw new Error('Failed to fetch audio data');
      }

      // If another track was requested while this one was loading, abort
      if (loadingTrackRef.current !== track.id) {
        console.log('Another track was requested, aborting this playback');
        return;
      }

      console.log('Audio data received, creating blob...');

      // Create blob and URL
      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      console.log('Loading audio from URL:', url);

      // Load and play
      audioRef.current.src = url;
      await audioRef.current.load();
      await audioRef.current.play();

      setIsPlaying(true);
      setError(null);
      
      // Clear loading state
      loadingTrackRef.current = null;
      setCurrentlyLoadingId(null);
      setIsLoading(false);

      // Update recent tracks
      setRecentTracks(prev => {
        const newTracks = prev.filter(t => t.id !== track.id);
        return [track, ...newTracks].slice(0, 10);
      });

    } catch (error) {
      console.error('Error playing track:', error);
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentlyLoadingId(null); // Clear the loading ID state
      loadingTrackRef.current = null; // Also clear the ref
      setError(error instanceof Error ? error.message : 'Failed to play track');
      throw error;
    }
  };

  const initializeAudio = async () => {
    if (!hasInteracted) {
      try {
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        setHasInteracted(true);
        setError(null);
      } catch (error) {
        console.error('Failed to initialize audio:', error);
        setError('Failed to initialize audio system');
      }
    }
  };

  const togglePlay = async () => {
    if (!hasInteracted) {
      await initializeAudio();
    }

    if (!audioRef.current) {
      console.error('Audio element not ready');
      setError('Audio system not ready');
      return;
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else if (currentTrack) {
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        await audioRef.current.play();
        setIsPlaying(true);
        setError(null);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setIsPlaying(false);
      setError('Failed to toggle playback');
    }
  };

  const { data: playlist = [] } = useQuery({
    queryKey: ["/api/playlists/current"],
    queryFn: async () => {
      try {
        const playlistData = await playlistManager.loadCurrentPortal();
        return playlistData.tracks;
      } catch (error) {
        console.error('Error loading playlist:', error);
        setError('Failed to load playlist');
        return [];
    },
    staleTime: 30000
  });

  // Store playTrack in ref for handleTrackEnd access
  const playTrackRef = useRef(playTrack);

  useEffect(() => {
    const handleInteraction = async () => {
      await initializeAudio();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    if (!hasInteracted) {
      window.addEventListener('click', handleInteraction);
      window.addEventListener('touchstart', handleInteraction);
    }
      playTrack,
      playlist,
      hasInteracted,
      recentTracks,
      currentlyLoadingId
    }}>
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