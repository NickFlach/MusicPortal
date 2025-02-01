import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Plus, ListMusic, Coins, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useContractWrite, useAccount } from 'wagmi';
import { PLAYLIST_NFT_ADDRESS, PLAYLIST_NFT_ABI } from "@/lib/contracts";
import { EditSongDialog } from "./EditSongDialog";
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
}

export function SongCard({ song, onClick, variant = "ghost", showDelete = false }: SongCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { address } = useAccount();

  const { data: playlists } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
  });

  const { writeAsync: mintSongNFT } = useContractWrite({
    address: PLAYLIST_NFT_ADDRESS,
    abi: PLAYLIST_NFT_ABI,
    functionName: 'mintSong',
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

  const mintNFTMutation = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error("Please connect your wallet first");
      if (!mintSongNFT) throw new Error("Contract write not available");

      try {
        const result = await mintSongNFT({
          args: [
            address,
            song.title,
            song.artist,
            song.ipfsHash,
            `ipfs://${song.ipfsHash}`
          ],
          value: parseEther("1"), // 1 GAS
        });

        toast({
          title: "Transaction Submitted",
          description: "Please wait for the transaction to be confirmed.",
        });

        const receipt = await result.wait();
        console.log('Transaction receipt:', receipt);

        return receipt;
      } catch (error: any) {
        if (error.code === 'ACTION_REJECTED') {
          throw new Error('Transaction was rejected by user');
        }
        throw new Error(error.message || "Failed to mint NFT");
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "NFT minted successfully! You've earned 1 PFORK token.",
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
            {showDelete && (
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </DropdownMenuItem>
            )}

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

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                if (window.confirm("Minting an NFT costs 1 GAS. Continue?")) {
                  mintNFTMutation.mutate();
                }
              }}
              disabled={mintNFTMutation.isPending || !address}
            >
              <Coins className="mr-2 h-4 w-4" />
              Mint as NFT
            </DropdownMenuItem>
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