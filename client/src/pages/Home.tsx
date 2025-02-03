import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MusicPlayer } from "@/components/MusicPlayer";
import { Layout } from "@/components/Layout";
import { useAccount } from 'wagmi';
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { MusicVisualizer } from "@/components/MusicVisualizer";
import { SongCard } from "@/components/SongCard";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Library } from "lucide-react";
import { uploadToIPFS } from "@/lib/ipfs";
import { EditSongDialog } from "@/components/EditSongDialog";
import * as musicMetadata from 'music-metadata-browser';

interface Song {
  id: number;
  title: string;
  artist: string;
  ipfsHash: string;
  uploadedBy: string | null;
  createdAt: string | null;
  votes: number | null;
}

interface AudioMetadata {
  title: string;
  artist: string;
  albumName?: string;
  genre?: string;
  releaseYear?: number;
  bpm?: number;
  key?: string;
  description?: string;
  isExplicit?: boolean;
  duration?: number;
}

async function extractAudioMetadata(file: File): Promise<AudioMetadata> {
  console.log('Starting metadata extraction for:', file.name);

  try {
    const metadata = await musicMetadata.parseBlob(file);
    console.log('Raw metadata extracted:', metadata);

    // Helper to get first item from array or undefined
    const getFirst = (arr?: any[]) => arr && arr.length > 0 ? arr[0] : undefined;

    const extracted: AudioMetadata = {
      title: metadata.common.title || file.name.replace(/\.[^/.]+$/, ''),
      artist: metadata.common.artist || '',
      albumName: metadata.common.album,
      genre: getFirst(metadata.common.genre),
      releaseYear: metadata.common.year,
      bpm: metadata.common.bpm,
      key: metadata.common.key,
      description: [
        metadata.common.album && `From the album "${metadata.common.album}"`,
        metadata.common.genre && `Genre: ${metadata.common.genre.join(', ')}`,
        metadata.common.comment && metadata.common.comment.join(' ')
      ].filter(Boolean).join('. '),
      isExplicit: metadata.common.explicit || false,
      duration: Math.round(metadata.format.duration || 0)
    };

    console.log('Processed metadata:', extracted);
    return extracted;
  } catch (error) {
    console.error('Error extracting metadata:', error);
    // Provide default values if metadata extraction fails
    return {
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: '',
      description: 'No metadata available'
    };
  }
}

export default function Home() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<File>();
  const { toast } = useToast();
  const { address } = useAccount();
  const { playSong, currentSong, recentSongs } = useMusicPlayer();
  const queryClient = useQueryClient();
  const [initialMetadata, setInitialMetadata] = useState<AudioMetadata>({
    title: '',
    artist: '',
  });

  const handleBackgroundClick = () => {
    const baseUrl = 'https://pitchfork-economy-nikolaiflaukows.replit.app/';
    const redirectUrl = address 
      ? `${baseUrl}?wallet=${address}`
      : baseUrl;
    window.location.href = redirectUrl;
  };

  // Only fetch library songs when wallet is connected
  const { data: librarySongs, isLoading: libraryLoading } = useQuery<Song[]>({
    queryKey: ["/api/songs/library"],
    enabled: !!address,
  });

  const playMutation = useMutation({
    mutationFn: async (songId: number) => {
      await apiRequest("POST", `/api/songs/play/${songId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/recent"] });
    },
  });

  const handlePlaySong = async (song: Song, context: 'library' | 'feed' = 'feed') => {
    if (!address) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to play songs",
        variant: "destructive",
      });
      return;
    }

    try {
      // Play the song with the specified context
      playSong(song, context);
      // Then update play count
      await playMutation.mutate(song.id);
    } catch (error) {
      console.error('Error playing song:', error);
      toast({
        title: "Error",
        description: "Failed to play song. Please try again.",
        variant: "destructive",
      });
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async ({ file, title, artist }: { file: File; title: string; artist: string }) => {
      if (!address) {
        throw new Error("Please connect your wallet to upload songs");
      }

      try {
        await apiRequest("POST", "/api/users/register", { address });
      } catch (error) {
        console.error('User registration error:', error);
      }

      try {
        console.log('Starting IPFS upload for file:', {
          name: file.name,
          size: file.size,
          type: file.type
        });

        const ipfsHash = await uploadToIPFS(file);
        console.log('IPFS upload successful, hash:', ipfsHash);

        const metadata = {
          title,
          artist,
          ipfsHash,
          ...initialMetadata,
        };

        console.log('Sending metadata to server:', metadata);
        const response = await apiRequest("POST", "/api/songs", metadata);
        return response.json();
      } catch (error) {
        console.error('Upload error:', error);
        throw error instanceof Error ? error : new Error('Unknown upload error');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/songs/recent"] });
      toast({
        title: "Success",
        description: "Song uploaded successfully!",
      });
      setPendingUpload(undefined);
      setUploadDialogOpen(false);
      setInitialMetadata({ title: '', artist: '' });
    },
    onError: (error: Error) => {
      console.error('Upload mutation error:', error);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    if (file.type !== 'audio/mpeg') {
      toast({
        title: "Invalid File Type",
        description: "Please select an MP3 file. Other audio formats are not supported.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Processing",
        description: "Extracting metadata from audio file...",
      });

      const metadata = await extractAudioMetadata(file);
      console.log('Extracted metadata:', metadata);

      setPendingUpload(file);
      setUploadDialogOpen(true);
      setInitialMetadata(metadata);

      toast({
        title: "Ready",
        description: "Metadata extracted successfully. Please review before uploading.",
      });
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Warning",
        description: "Could not extract metadata, but you can still upload the file.",
      });
      setPendingUpload(file);
      setUploadDialogOpen(true);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col min-h-screen">
        {/* Add clickable background div */}
        <div 
          onClick={handleBackgroundClick}
          className="absolute inset-0 z-0 cursor-pointer"
          style={{ 
            top: '64px', // Height of the header
            bottom: 'auto',
            height: 'calc(30vh)', // Match the height of the MusicVisualizer section
          }}
        />

        <section className="h-[30vh] mb-6 relative">
          <MusicVisualizer />
        </section>

        {/* Rest of the JSX remains unchanged */}
        <div className="flex-1 grid grid-cols-1 gap-6 mb-24 relative z-10">
          {address ? (
            <section className="px-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">Your Library</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center text-muted-foreground">
                    <Library className="mr-2 h-4 w-4" />
                    {librarySongs?.length || 0} songs
                  </div>
                  <Input
                    type="file"
                    accept=".mp3,audio/mpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="song-upload"
                  />
                  <label htmlFor="song-upload">
                    <Button variant="outline" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Song
                      </span>
                    </Button>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                {libraryLoading ? (
                  <p className="text-muted-foreground">Loading your library...</p>
                ) : librarySongs?.length === 0 ? (
                  <p className="text-muted-foreground">No songs in your library yet</p>
                ) : (
                  librarySongs?.map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      onClick={() => handlePlaySong(song, 'library')}
                      showDelete={true}
                      isPlaying={currentSong?.id === song.id}
                    />
                  ))
                )}
              </div>
            </section>
          ) : null}

          <section className="px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Discovery Feed</h2>
              <p className="text-sm text-muted-foreground">Latest plays from the community</p>
            </div>

            <div className="grid gap-2">
              {recentSongs?.length === 0 ? (
                <p className="text-muted-foreground">No songs played yet</p>
              ) : (
                recentSongs?.map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    onClick={() => handlePlaySong(song, 'feed')}
                    isPlaying={currentSong?.id === song.id}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <EditSongDialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) setPendingUpload(undefined);
        }}
        mode="create"
        initialMetadata={initialMetadata}
        onSubmit={({ title, artist }) => {
          if (pendingUpload) {
            uploadMutation.mutate({
              file: pendingUpload,
              title,
              artist,
            });
          }
        }}
      />
    </Layout>
  );
}