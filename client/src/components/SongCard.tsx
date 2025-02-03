import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Plus, Trash2, ListMusic, Coins, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useContractWrite, useAccount } from 'wagmi';
import { PLAYLIST_NFT_ADDRESS, PLAYLIST_NFT_ABI } from "@/lib/contracts";
import { EditSongDialog } from "./EditSongDialog";
import { SocialShare } from "./SocialShare";
import { useState } from "react";
import { parseEther } from "viem";

interface Song {
  id: number;
  title: string;
  artist: string;
  ipfsHash: string;
  uploadedBy: string | null;
  createdAt: string | null;
  votes: number | null;
}

interface SongCardProps {
  song: Song;
  onClick: () => void;
  variant?: "ghost" | "default";
  showDelete?: boolean;
  isPlaying?: boolean;
}

export function SongCard({ song, onClick, variant = "ghost", showDelete = false, isPlaying = false }: SongCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { address } = useAccount();

  const { data: playlists } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
  });

  // Contract write for minting NFT
  const { write: mintSongNFT } = useContractWrite({
    ...PLAYLIST_NFT_ADDRESS,
    ...PLAYLIST_NFT_ABI,
    functionName: 'mintSong',
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
    <>
      <div className="flex items-center justify-between group p-2 hover:bg-accent rounded-lg transition-colors">
        <div className="flex-1 flex items-center gap-4">
          <Button
            variant={variant}
            className={`flex-1 justify-start ${isPlaying ? 'text-primary' : ''}`}
            onClick={onClick}
          >
            <span className="truncate">{song.title}</span>
            <span className="ml-2 text-muted-foreground">- {song.artist}</span>
          </Button>

          {/* Social Share buttons */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <SocialShare
              song={song}
              variant="inline"
            />
          </div>
        </div>

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
            {showDelete && (
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </DropdownMenuItem>
            )}

            {!playlists?.length ? (
              <DropdownMenuItem className="text-muted-foreground" disabled>
                <ListMusic className="mr-2 h-4 w-4" />
                Create a playlist first
              </DropdownMenuItem>
            ) : (
              playlists.map((playlist) => (
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
              ))
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                if (window.confirm("Minting an NFT costs 1 GAS. Continue?")) {
                  mintNFTMutation.mutate();
                }
              }}
              disabled={!address}
            >
              <Coins className="mr-2 h-4 w-4" />
              Mint as NFT
            </DropdownMenuItem>

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

      <EditSongDialog
        song={song}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mode="edit"
      />
    </>
  );
}