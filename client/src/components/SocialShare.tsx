import { Share2, Facebook, Link as LinkIcon } from "lucide-react";
import { SiX } from "react-icons/si";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import type { Song } from "@/types/song";

interface SocialShareProps {
  song: Song;
  variant?: "inline" | "dropdown";
  className?: string;
}

export function SocialShare({ song, variant = "inline", className = "" }: SocialShareProps) {
  if (!song) {
    return null;
  }

  const baseUrl = "https://neo-music-portal.repl.co";
  const songUrl = `/song/${song.id}`;

  // Create platform-specific share content
  const twitterText = [
    `🎵 "${song.title}"`,
    song.artist ? `by ${song.artist}` : '',
    song.albumName ? `from ${song.albumName}` : '',
    song.genre ? `#${song.genre.replace(/[^a-zA-Z0-9]/g, '')}` : '',
    '🎶 Listen on NEO Music Portal!'
  ].filter(Boolean).join(' ');

  const facebookQuote = [
    `Check out "${song.title}"`,
    song.artist ? `by ${song.artist}` : '',
    song.albumName ? `from the album "${song.albumName}"` : '',
    song.description || 'Listen to this amazing track on NEO Music Portal!'
  ].filter(Boolean).join(' ');

  const encodedTwitterText = encodeURIComponent(twitterText);
  const encodedFacebookQuote = encodeURIComponent(facebookQuote);
  const encodedUrl = encodeURIComponent(`${baseUrl}${songUrl}`);

  const shareLinks = {
    x: `https://twitter.com/intent/tweet?text=${encodedTwitterText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedFacebookQuote}`,
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${baseUrl}${songUrl}`);
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
          href={shareLinks.x}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-black hover:bg-gray-800 transition-colors"
          aria-label="Share on X"
        >
          <SiX className="h-4 w-4 text-white" />
        </a>
        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-[#1877F2] hover:bg-[#166fe5] transition-colors"
          aria-label="Share on Facebook"
        >
          <Facebook className="h-4 w-4 text-white" />
        </a>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={copyToClipboard}
          aria-label="Copy link"
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
            href={shareLinks.x}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <SiX className="mr-2 h-4 w-4" />
            Share on X
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