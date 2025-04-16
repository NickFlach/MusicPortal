import { useAccount } from 'wagmi';
import { WalletConnect } from "@/components/WalletConnect";
import { useLocation } from 'wouter';
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Volume2, VolumeX, Loader2, Music } from "lucide-react";
import { useEffect, useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { SongCard } from "@/components/SongCard";

// Define the song type to match server response
interface Song {
  id: number;
  title: string;
  artist: string;
  ipfsHash: string | null;
  uploadedBy: string | null;
  createdAt: string | null;
  votes: number | null;
}

export default function Landing() {
  const { address } = useAccount();
  const [, setLocation] = useLocation();
  const { currentTrack, isPlaying, togglePlay, playTrack } = useMusicPlayer();
  const [isLoading, setIsLoading] = useState(true);

  // Fetch recent songs directly here for better error handling
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
        
        // If we got back data but it's empty, return a default song
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
        // Return a default song during errors to prevent cascading failures
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

  // Initialize music once songs are loaded
  useEffect(() => {
    async function initializeMusic() {
      if (!recentSongs?.length || currentTrack) return;

      try {
        console.log('Initializing music with first song:', recentSongs[0]);
        // Handle any missing fields gracefully
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

  // Function to handle playing a song from the song list
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

  // Don't redirect away from landing if already here
  if (address && window.location.pathname === '/') return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("/neo_token_logo_flaukowski.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(8px)',
          transform: 'scale(1.1)',
          opacity: '0.15'
        }}
      />

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex flex-col">
          {/* Featured Section with Logo and Current Playing */}
          <section className="flex flex-col items-center justify-center h-[60vh] space-y-6">
            <button 
              onClick={togglePlay}
              className="group relative transition-transform hover:scale-105 focus:outline-none rounded-lg"
              disabled={isLoading || !currentTrack}
            >
              <img 
                src="/neo_token_logo_flaukowski.png" 
                alt="Music Portal Logo"
                className={`w-48 h-48 object-contain ${isPlaying ? 'animate-pulse' : ''}`}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-background/80 backdrop-blur-sm p-4 rounded-full">
                  {isPlaying ? (
                    <VolumeX className="h-10 w-10 text-primary" />
                  ) : (
                    <Volume2 className="h-10 w-10 text-primary" />
                  )}
                </div>
              </div>
            </button>

            {/* Now Playing Display */}
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading music...</span>
              </div>
            ) : currentTrack ? (
              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold">{currentTrack.title}</h2>
                <p className="text-sm text-muted-foreground">{currentTrack.artist}</p>
              </div>
            ) : songsError ? (
              <div className="text-destructive text-sm">
                Failed to load music. Please try again later.
              </div>
            ) : null}

            {/* Connect Wallet Button */}
            <div className="mt-4">
              <WalletConnect />
            </div>
          </section>

          {/* Discovery Feed Section */}
          <section className="mt-8 pb-24">
            <div className="flex items-center gap-2 mb-4">
              <Music className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Discovery Feed</h2>
            </div>
            
            <div className="grid gap-2 max-w-2xl mx-auto">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading recent tracks...</span>
                </div>
              ) : recentSongs && recentSongs.length > 0 ? (
                recentSongs.map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    onClick={() => handlePlaySong(song)}
                    isPlaying={currentTrack?.id === song.id}
                    variant="default"
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recent tracks available</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}