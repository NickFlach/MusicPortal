import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonProps {
  title: string;
  text: string;
  url?: string;
}

export function ShareButton({ title, text, url }: ShareButtonProps) {
  const { toast } = useToast();
  
  const handleShare = async () => {
    const shareData = {
      title,
      text,
      url: url || window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        toast({
          title: "Copied to clipboard",
          description: "Share link has been copied to your clipboard!",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share content",
        variant: "destructive",
      });
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleShare}
      title="Share"
    >
      <Share2 className="h-4 w-4" />
    </Button>
  );
}
