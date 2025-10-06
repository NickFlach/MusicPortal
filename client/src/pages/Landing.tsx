import { useAccount } from 'wagmi';
import { WalletConnect } from "@/components/WalletConnect";
import { useLocation } from 'wouter';
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Volume2, VolumeX, Loader2, Music, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState, useMemo } from 'react';
import { useQuery } from "@tanstack/react-query";
import { SongCard } from "@/components/SongCard";
import { motion, AnimatePresence } from "framer-motion";

interface Song {
  id: number;
  title: string;
  artist: string;
  ipfsHash?: string;
  uploadedBy: string | null;
  createdAt: string | null;
  votes: number | null;
}

export default function Landing() {
  const { address } = useAccount();
  const [, setLocation] = useLocation();
  const { currentTrack, isPlaying, togglePlay, playTrack } = useMusicPlayer();
  const [isLoading, setIsLoading] = useState(true);
  const [showDiscovery, setShowDiscovery] = useState(false);

  const { data: recentSongs, error: songsError } = useQuery<Song[]>({
    queryKey: ["/api/songs/recent"],
    queryFn: async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Internal-Token': 'landing-page'
        };

        if (address) {
          headers['X-Wallet-Address'] = address;
        }

        const response = await fetch("/api/songs/recent", { headers });

        if (!response.ok) {
          throw new Error(`Failed to fetch recent songs: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Recent songs loaded:', data.length, 'songs');
        
        if (!data || data.length === 0) {
          console.log('No songs returned from API, using fallback');
          return [{
            id: 1001,
            title: "NULL_ISLAND Beacon",
            artist: "SINet System",
            ipfsHash: null,
            uploadedBy: "system",
            createdAt: new Date().toISOString(),
            votes: 0
          }];
        }
        
        return data;
      } catch (error) {
        console.error('Error fetching recent songs:', error);
        return [{
          id: 1001,
          title: "NULL_ISLAND Beacon",
          artist: "SINet System",
          ipfsHash: null,
          uploadedBy: "system",
          createdAt: new Date().toISOString(),
          votes: 0
        }];
      }
    },
    retry: 3,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (address) {
      setLocation("/home");
    }
  }, [address, setLocation]);

  useEffect(() => {
    async function initializeMusic() {
      if (!recentSongs?.length || currentTrack) return;

      try {
        console.log('Initializing music with first song:', recentSongs[0]);
        const track = {
          id: recentSongs[0].id,
          title: recentSongs[0].title || "Unknown Title",
          artist: recentSongs[0].artist || "Unknown Artist",
          ipfsHash: recentSongs[0].ipfsHash || ""
        };
        await playTrack(track);
      } catch (error) {
        console.error('Error initializing music:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!address) {
      initializeMusic();
    }
  }, [recentSongs, address, currentTrack, playTrack]);

  const handlePlaySong = async (song: Song) => {
    try {
      const track = {
        id: song.id,
        title: song.title || "Unknown Title",
        artist: song.artist || "Unknown Artist",
        ipfsHash: song.ipfsHash || ""
      };
      await playTrack(track);
    } catch (error) {
      console.error('Error playing song:', error);
    }
  };

  const particles = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
    }));
  }, []);

  if (address && window.location.pathname === '/') return null;

  return (
    <div className="min-h-screen relative overflow-hidden animated-gradient">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: particle.left,
              top: particle.top,
              animationDelay: particle.delay,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <motion.div 
          className="flex-1 flex flex-col items-center justify-center px-4 py-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8"
          >
            <button 
              onClick={togglePlay}
              className="group relative transition-transform hover:scale-105 focus:outline-none rounded-lg float-animation"
              disabled={isLoading || !currentTrack}
              aria-label={isPlaying ? "Pause music" : "Play music"}
            >
              <img 
                src="/neo_token_logo_flaukowski.png" 
                alt="Music Portal"
                className={`w-40 h-40 md:w-56 md:h-56 object-contain pulse-glow ${isPlaying ? 'opacity-100' : 'opacity-80'}`}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="glass-morphism p-4 md:p-6 rounded-full">
                  {isPlaying ? (
                    <VolumeX className="h-8 w-8 md:h-12 md:w-12 text-white" />
                  ) : (
                    <Volume2 className="h-8 w-8 md:h-12 md:w-12 text-white" />
                  )}
                </div>
              </div>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-center space-y-3 mb-8"
          >
            {isLoading ? (
              <div className="flex items-center gap-2 text-white/60">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm md:text-base">Loading music...</span>
              </div>
            ) : currentTrack ? (
              <>
                <h2 className="text-xl md:text-3xl font-bold text-white tracking-tight">
                  {currentTrack.title}
                </h2>
                <p className="text-sm md:text-lg text-white/70">
                  {currentTrack.artist}
                </p>
              </>
            ) : songsError ? (
              <div className="text-red-400 text-sm">
                Failed to load music. Please try again later.
              </div>
            ) : null}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="glass-morphism rounded-2xl px-6 py-3"
          >
            <WalletConnect />
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            onClick={() => setShowDiscovery(!showDiscovery)}
            className="mt-12 flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
            aria-label="Toggle discovery feed"
          >
            <Music className="h-4 w-4" />
            <span className="text-sm font-medium">Discovery Feed</span>
            {showDiscovery ? (
              <ChevronUp className="h-4 w-4 group-hover:translate-y-[-2px] transition-transform" />
            ) : (
              <ChevronDown className="h-4 w-4 group-hover:translate-y-[2px] transition-transform" />
            )}
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {showDiscovery && (
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative"
            >
              <div className="glass-morphism rounded-t-3xl p-6 md:p-8 max-h-[60vh] overflow-y-auto">
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Music className="h-5 w-5 text-white" />
                      <h2 className="text-xl font-semibold text-white">Recent Tracks</h2>
                    </div>
                    <button
                      onClick={() => setShowDiscovery(false)}
                      className="text-white/60 hover:text-white transition-colors"
                      aria-label="Close discovery feed"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {isLoading ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-2 text-white/60" />
                        <span className="text-white/60">Loading recent tracks...</span>
                      </div>
                    ) : recentSongs && recentSongs.length > 0 ? (
                      recentSongs.map((song, index) => (
                        <motion.div
                          key={song.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.05 }}
                        >
                          <SongCard
                            song={song}
                            onClick={() => handlePlaySong(song)}
                            isPlaying={currentTrack?.id === song.id}
                            variant="default"
                          />
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-white/40">
                        <p>No recent tracks available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
