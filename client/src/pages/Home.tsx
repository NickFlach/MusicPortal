import { MusicPlayer } from "@/components/MusicPlayer";
import { Layout } from "@/components/Layout";
import { useAccount } from 'wagmi';
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { MusicVisualizer } from "@/components/MusicVisualizer";
import { SongCard } from "@/components/SongCard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Song {
  id: number;
  title: string;
  artist: string;
  ipfsHash: string;
  uploadedBy: string | null;
  createdAt: string | null;
  votes: number | null;
}

export default function Home() {
  const { address } = useAccount();
  const { playSong, recentSongs } = useMusicPlayer();
  const queryClient = useQueryClient();

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

  return (
    <Layout>
      <section className="mb-12">
        <MusicVisualizer />
      </section>

      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Recent Songs</h2>
          <p className="text-sm text-muted-foreground">Last 20 played</p>
        </div>

        <div className="space-y-2">
          {recentSongs?.length === 0 ? (
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
    </Layout>
  );
}