import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

interface Playlist {
  id: number;
  name: string;
  createdBy: string | null;
  createdAt: string | null;
}

interface SongCardProps {
  song: Song;
  onClick: () => void;
  variant?: "ghost" | "default";
  showDelete?: boolean;
}

export function SongCard({ song, onClick, variant = "ghost", showDelete = false }: SongCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: playlists } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: async ({ playlistId, songId }: { playlistId: number; songId: number }) => {
      await apiRequest("POST", `/api/playlists/${playlistId}/songs`, { songId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Success",
        description: "Song added to playlist",
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

  const deleteSongMutation = useMutation({
    mutationFn: async (songId: number) => {
      await apiRequest("DELETE", `/api/songs/${songId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/library"] });
      toast({
        title: "Success",
        description: "Song deleted from library",
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

  return (
    <div className="flex items-center justify-between group">
      <Button
        variant={variant}
        className="flex-1 justify-start"
        onClick={onClick}
      >
        <span className="truncate">{song.title}</span>
        <span className="ml-2 text-muted-foreground">- {song.artist}</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {playlists?.map((playlist) => (
            <DropdownMenuItem
              key={playlist.id}
              onClick={() => {
                addToPlaylistMutation.mutate({
                  playlistId: playlist.id,
                  songId: song.id,
                });
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add to {playlist.name}
            </DropdownMenuItem>
          ))}

          {showDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this song?")) {
                    deleteSongMutation.mutate(song.id);
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete from Library
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}