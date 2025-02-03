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

interface SimpleMetadata {
  title: string;
  artist: string;
}

export default function Home() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<File>();
  const { toast } = useToast();
  const { address } = useAccount();
  const { playSong, currentSong, recentSongs } = useMusicPlayer();
  const queryClient = useQueryClient();
  const [initialMetadata, setInitialMetadata] = useState<SimpleMetadata>({
    title: '',
    artist: ''
  });

  const handleBackgroundClick = () => {
    const baseUrl = 'https://pitchfork-economy-nikolaiflaukows.replit.app/';
    const redirectUrl = address 
      ? `${baseUrl}?wallet=${address}`
      : baseUrl;
    window.location.href = redirectUrl;
  };

  const { data: librarySongs, isLoading: libraryLoading } = useQuery({
    queryKey: ["/api/songs/library"],
    enabled: !!address,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'audio/mpeg') {
      toast({
        title: "Invalid File Type",
        description: "Please select an MP3 file",
        variant: "destructive",
      });
      return;
    }

    try {
      const metadata = await musicMetadata.parseBlob(file);
      console.log('Raw metadata:', metadata);

      setInitialMetadata({
        title: metadata.common.title || file.name.replace(/\.[^/.]+$/, ''),
        artist: metadata.common.artist || ''
      });
      setPendingUpload(file);
      setUploadDialogOpen(true);
    } catch (error) {
      console.error('Error reading metadata:', error);
      // If metadata extraction fails, just use filename
      setInitialMetadata({
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: ''
      });
      setPendingUpload(file);
      setUploadDialogOpen(true);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async ({ file, title, artist }: { file: File; title: string; artist: string }) => {
      if (!address) throw new Error("Please connect your wallet to upload songs");

      const ipfsHash = await uploadToIPFS(file);
      console.log('IPFS upload successful, hash:', ipfsHash);

      const response = await apiRequest("POST", "/api/songs", {
        title,
        artist,
        ipfsHash
      });
      return response.json();
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
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

    const playMutation = useMutation({
    mutationFn: async (songId: number) => {
      await apiRequest("POST", `/api/songs/play/${songId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/recent"] });
    },
  });
  
    const handlePlaySong = async (song: any, context: 'library' | 'feed' = 'feed') => {
    if (!address) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to play songs",
        variant: "destructive",
      });
      return;
    }

    try {
      playSong(song, context);
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

  return (
    <Layout>
      <div className="flex flex-col min-h-screen">
        <div 
          onClick={handleBackgroundClick}
          className="absolute inset-0 z-0 cursor-pointer"
          style={{ 
            top: '64px',
            bottom: 'auto',
            height: 'calc(30vh)',
          }}
        />

        <section className="h-[30vh] mb-6 relative">
          <MusicVisualizer />
        </section>

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
                  librarySongs?.map((song: any) => (
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
                recentSongs?.map((song: any) => (
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