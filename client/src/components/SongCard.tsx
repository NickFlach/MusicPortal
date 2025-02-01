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
import { getPlaylistNFTContract, connectWallet } from "@/lib/contracts";
import { EditSongDialog } from "./EditSongDialog";
import { useState } from "react";
import { ethers } from "ethers";

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
  const [isMinting, setIsMinting] = useState(false);

  const { data: playlists } = useQuery<{ id: number; name: string }[]>({
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

  const handleMintNFT = async () => {
    try {
      setIsMinting(true);

      // Get wallet connection first
      const { signer } = await connectWallet();

      // Get contract instance with signer
      const contract = getPlaylistNFTContract(signer);

      // Mint NFT
      const tx = await contract.mintSong(
        await signer.getAddress(),
        song.title,
        song.artist,
        song.ipfsHash,
        `ipfs://${song.ipfsHash}`,
        { value: ethers.parseEther("1") }
      );

      toast({
        title: "Transaction Sent",
        description: "Please wait while your NFT is being minted...",
      });

      // Wait for transaction to be mined
      await tx.wait();

      toast({
        title: "Success",
        description: "NFT minted successfully! You've earned 1 PFORK token.",
      });
    } catch (error: any) {
      console.error('Mint error:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to mint NFT",
        variant: "destructive",
      });
    } finally {
      setIsMinting(false);
    }
  };

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
                  handleMintNFT();
                }
              }}
              disabled={isMinting}
            >
              <Coins className="mr-2 h-4 w-4" />
              {isMinting ? "Minting..." : "Mint as NFT"}
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