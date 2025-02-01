import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Plus, Coins } from "lucide-react";
import { ShareButton } from "@/components/ui/share-button";
import { useToast } from "@/hooks/use-toast";
import { getPlaylistNFTContract, connectWallet } from "@/lib/contracts";
import { ethers } from "ethers";
import { useState } from "react";

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
  const [isMinting, setIsMinting] = useState(false);

  const handleMintNFT = async () => {
    try {
      setIsMinting(true);

      // Get wallet connection first
      const { signer } = await connectWallet();

      // Get contract instance with signer
      const contract = getPlaylistNFTContract(signer);

      if (songCount === 0) {
        throw new Error("Cannot mint empty playlist");
      }

      // Mint NFT
      const tx = await contract.mintPlaylist(
        await signer.getAddress(),
        title,
        `ipfs://playlist-${id}`,
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
        description: "Playlist NFT minted successfully! You've earned 2 PFORK tokens.",
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
                    handleMintNFT();
                  }
                }}
                disabled={songCount === 0 || isMinting}
              >
                <Coins className="h-4 w-4 mr-2" />
                {isMinting ? "Minting..." : "Mint NFT"}
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