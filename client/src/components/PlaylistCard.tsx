import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Plus, Coins } from "lucide-react";
import { ShareButton } from "@/components/ui/share-button";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useContractWrite, useAccount } from 'wagmi';
import { PLAYLIST_NFT_ADDRESS, PLAYLIST_NFT_ABI } from "@/lib/contracts";
import { parseEther } from "viem";

interface PlaylistCardProps {
  title: string;
  songCount: number;
  image?: string;
  createdBy?: string;
  onPlay: () => void;
  onAddSong: () => void;
  id: number;
  isNft?: boolean;
}

export function PlaylistCard({
  id,
  title,
  songCount,
  image,
  createdBy,
  onPlay,
  onAddSong,
  isNft = false,
}: PlaylistCardProps) {
  const { toast } = useToast();
  const { address } = useAccount();

  const { writeAsync: mintPlaylistNFT } = useContractWrite({
    address: PLAYLIST_NFT_ADDRESS,
    abi: PLAYLIST_NFT_ABI,
    functionName: 'mintPlaylist',
  });

  const mintNftMutation = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error("Please connect your wallet first");
      if (!mintPlaylistNFT) throw new Error("Contract write not available");
      if (songCount === 0) throw new Error("Cannot mint empty playlist");

      try {
        const result = await mintPlaylistNFT({
          args: [
            address,
            title,
            `ipfs://playlist-${id}`
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
        description: "Playlist NFT minting successful! You've earned 2 PFORK tokens.",
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
    <Card className="overflow-hidden group hover:bg-accent transition-colors">
      <CardHeader className="relative p-0">
        <div className="aspect-square overflow-hidden">
          <img
            src={"/neo_token_logo_flaukowski.png"}
            alt={title}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="icon" variant="secondary" onClick={onPlay}>
              <Play className="h-6 w-6" />
            </Button>
            <Button size="icon" variant="secondary" onClick={onAddSong}>
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div>
            <CardTitle className="text-lg mb-1">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{songCount} songs</p>
            {createdBy && (
              <p className="text-xs text-muted-foreground mt-1">
                Created by {createdBy.slice(0, 6)}...{createdBy.slice(-4)}
              </p>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            {!isNft && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (window.confirm("Minting an NFT costs 1 GAS. Continue?")) {
                    mintNftMutation.mutate();
                  }
                }}
                disabled={mintNftMutation.isPending || !address || songCount === 0}
              >
                <Coins className="h-4 w-4 mr-2" />
                Mint NFT
              </Button>
            )}
            <ShareButton
              title={`Check out this playlist: ${title}`}
              text={`A playlist with ${songCount} songs on Music Portal`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}