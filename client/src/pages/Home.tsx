import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MusicPlayer } from "@/components/MusicPlayer";
import { PlaylistCard } from "@/components/PlaylistCard";
import { Button } from "@/components/ui/button";
import { uploadToIPFS } from "@/lib/ipfs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, ListMusic, Library } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useAccount } from 'wagmi';
import { SongCard } from "@/components/SongCard";
import { EditSongDialog } from "@/components/EditSongDialog";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { MusicVisualizer } from "@/components/MusicVisualizer";

interface Song {
  id: number;
  title: string;
  artist: string;
  ipfsHash: string;
  uploadedBy: string | null;
  createdAt: string | null;
  votes: number | null;
}

interface Playlist {
  id: number;
  name: string;
  createdBy: string | null;
  createdAt: string | null;
}

interface PlaylistWithSongs extends Playlist {
  playlistSongs: {
    song: Song;
  }[];
}

export default function Home() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<File>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { playSong, recentSongs } = useMusicPlayer();

  const { data: librarySongs, isLoading: libraryLoading } = useQuery<Song[]>({
    queryKey: ["/api/songs/library"],
    enabled: !!address,
  });

  const { data: playlists } = useQuery<PlaylistWithSongs[]>({
    queryKey: ["/api/playlists"],
  });

  const playMutation = useMutation({
    mutationFn: async (songId: number) => {
      await apiRequest("POST", `/api/songs/play/${songId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/recent"] });
    },
  });

  const handlePlaySong = async (song: Song) => {
    playSong(song);
    await playMutation.mutate(song.id);
  };

  const uploadMutation = useMutation({
    mutationFn: async ({ file, title, artist }: { file: File; title: string; artist: string }) => {
      try {
        await apiRequest("POST", "/api/users/register");
      } catch (error) {
        console.error('User registration error:', error);
        throw new Error("Failed to register user. Please try reconnecting your wallet.");
      }

      toast({
        title: "Upload Started",
        description: "Uploading your song to IPFS...",
      });

      try {
        const ipfsHash = await uploadToIPFS(file);

        const response = await apiRequest("POST", "/api/songs", {
          title,
          artist,
          ipfsHash,
        });

        return await response.json();
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
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
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
    const createPlaylistMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/playlists", { name });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Success",
        description: "Playlist created successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreatePlaylist = () => {
    const name = prompt("Enter playlist name:");
    if (name) {
      createPlaylistMutation.mutate(name);
    }
  };


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    const file = e.target.files[0];
    if (!file.type.includes('audio')) {
      toast({
        title: "Error",
        description: "Please select an audio file",
        variant: "destructive",
      });
      return;
    }

    setPendingUpload(file);
    setUploadDialogOpen(true);
  };

  return (
    <Layout>
      <section className="mb-12">
        <MusicVisualizer />
      </section>

      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Your Playlists</h2>
          <Button variant="outline" onClick={handleCreatePlaylist}>
            <ListMusic className="mr-2 h-4 w-4" />
            New Playlist
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {playlists?.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              id={playlist.id}
              title={playlist.name}
              songCount={playlist.playlistSongs?.length || 0}
              createdBy={playlist.createdBy}
              onPlay={() => {
                if (playlist.playlistSongs?.[0]) {
                  handlePlaySong(playlist.playlistSongs[0].song);
                }
              }}
              onAddSong={() => {
              }}
            />
          ))}
        </div>
      </section>

      {address && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Your Library</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center text-muted-foreground">
                <Library className="mr-2 h-4 w-4" />
                {librarySongs?.length || 0} songs
              </div>
              <Input
                type="file"
                accept="audio/*"
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
                  onClick={() => handlePlaySong(song)}
                  showDelete={true}
                />
              ))
            )}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Recent Songs</h2>
          <p className="text-sm text-muted-foreground">Last 20 played</p>
        </div>

        <div className="space-y-2">
          {libraryLoading ? (
              <p className="text-muted-foreground">Loading songs...</p>
            ) : recentSongs?.length === 0 ? (
            <p className="text-muted-foreground">No songs played yet</p>
          ) : (
            recentSongs?.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onClick={() => handlePlaySong(song)}
              />
            ))
          )}
        </div>
      </section>
      <EditSongDialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) setPendingUpload(undefined);
        }}
        mode="create"
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