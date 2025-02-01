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

export default function Home() {
  const [currentSong, setCurrentSong] = useState<Song>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { address } = useAccount();

  const { data: songs, isLoading: songsLoading } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
  });

  const { data: playlists } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
  });

  // Filter songs for library section
  const userSongs = songs?.filter(song => song.uploadedBy === address);

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const file = data.get("file") as File;
      const title = data.get("title") as string;
      const artist = data.get("artist") as string;

      if (!file || !title || !artist) {
        throw new Error("Missing required fields");
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

        const newSong = await response.json();
        return newSong;
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Only invalidate the songs query, don't change current playback
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });

      toast({
        title: "Success",
        description: "Song uploaded successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(/\.[^/.]+$/, "")); // Remove extension
    formData.append("artist", "Unknown Artist");

    uploadMutation.mutate(formData);
  };

  return (
    <Layout>
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Your Playlists</h2>
          <Button variant="outline">
            <ListMusic className="mr-2 h-4 w-4" />
            New Playlist
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {playlists?.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              title={playlist.name}
              songCount={0}
              onPlay={() => {}}
              onAddSong={() => {}}
            />
          ))}
        </div>
      </section>

      {address && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Your Library</h2>
            <div className="flex items-center text-muted-foreground">
              <Library className="mr-2 h-4 w-4" />
              {userSongs?.length || 0} songs
            </div>
          </div>

          <div className="space-y-2">
            {userSongs?.length === 0 ? (
              <p className="text-muted-foreground">No songs in your library yet</p>
            ) : (
              userSongs?.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  onClick={() => setCurrentSong(song)}
                />
              ))
            )}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Recent Songs</h2>
          <div className="flex items-center gap-4">
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
          {songsLoading ? (
            <p className="text-muted-foreground">Loading songs...</p>
          ) : songs?.length === 0 ? (
            <p className="text-muted-foreground">No songs uploaded yet</p>
          ) : (
            songs?.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onClick={() => setCurrentSong(song)}
              />
            ))
          )}
        </div>
      </section>

      <MusicPlayer
        currentSong={currentSong}
        onNext={() => {
          if (!songs || !currentSong) return;
          const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
          setCurrentSong(songs[(currentIndex + 1) % songs.length]);
        }}
        onPrevious={() => {
          if (!songs || !currentSong) return;
          const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
          setCurrentSong(songs[(currentIndex - 1 + songs.length) % songs.length]);
        }}
      />
    </Layout>
  );
}