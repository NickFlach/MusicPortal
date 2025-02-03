import { Share2, Twitter, Facebook, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

interface SocialShareProps {
  songTitle: string;
  artist: string;
  ipfsHash: string;
  variant?: "inline" | "dropdown";
  className?: string;
}

export function SocialShare({ songTitle, artist, ipfsHash, variant = "inline", className = "" }: SocialShareProps) {
  const baseUrl = window.location.origin;
  const songUrl = `${baseUrl}/song/${ipfsHash}`;
  const shareText = `🎵 Check out "${songTitle}" by ${artist} on our decentralized music platform! 🎶`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(songUrl);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(songUrl);
      toast({
        title: "Link copied!",
        description: "Share link has been copied to clipboard",
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <a
          href={shareLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-[#1DA1F2] hover:bg-[#1a8cd8] transition-colors"
        >
          <Twitter className="h-4 w-4 text-white" />
        </a>
        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-[#1877F2] hover:bg-[#166fe5] transition-colors"
        >
          <Facebook className="h-4 w-4 text-white" />
        </a>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={copyToClipboard}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem asChild>
          <a
            href={shareLinks.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <Twitter className="mr-2 h-4 w-4 text-[#1DA1F2]" />
            Share on Twitter
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={shareLinks.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <Facebook className="mr-2 h-4 w-4 text-[#1877F2]" />
            Share on Facebook
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyToClipboard} className="flex items-center">
          <LinkIcon className="mr-2 h-4 w-4" />
          Copy Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}