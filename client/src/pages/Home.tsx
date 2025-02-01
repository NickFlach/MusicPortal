import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MusicPlayer } from "@/components/MusicPlayer";
import { PlaylistCard } from "@/components/PlaylistCard";
import { WalletConnect } from "@/components/WalletConnect";
import { Button } from "@/components/ui/button";
import { uploadToIPFS } from "@/lib/ipfs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, ListMusic } from "lucide-react";

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

  const { data: songs } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
  });

  const { data: playlists } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const file = data.get("file") as File;
      const title = data.get("title") as string;
      const artist = data.get("artist") as string;

      const ipfsHash = await uploadToIPFS(file);

      await apiRequest("POST", "/api/songs", {
        title,
        artist,
        ipfsHash,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Song uploaded successfully!",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    formData.append("title", e.target.files[0].name.replace(".mp3", ""));
    formData.append("artist", "Unknown Artist");

    uploadMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Decentralized Music
          </h1>
          <WalletConnect />
        </div>
      </header>

      <main className="container mx-auto pt-24 pb-32">
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

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Recent Songs</h2>
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".mp3"
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
            {songs?.map((song) => (
              <Button
                key={song.id}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => setCurrentSong(song)}
              >
                <span className="truncate">{song.title}</span>
                <span className="ml-2 text-muted-foreground">- {song.artist}</span>
              </Button>
            ))}
          </div>
        </section>
      </main>

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
    </div>
  );
}