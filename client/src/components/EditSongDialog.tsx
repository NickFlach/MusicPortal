import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface SimpleMetadata {
  title: string;
  artist: string;
}

interface EditSongDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'edit' | 'create';
  onSubmit?: (data: SimpleMetadata) => void;
  initialMetadata?: SimpleMetadata;
}

export function EditSongDialog({ 
  open, 
  onOpenChange,
  mode,
  onSubmit,
  initialMetadata 
}: EditSongDialogProps) {
  const [title, setTitle] = React.useState(initialMetadata?.title || '');
  const [artist, setArtist] = React.useState(initialMetadata?.artist || '');
  const { toast } = useToast();

  React.useEffect(() => {
    if (initialMetadata) {
      setTitle(initialMetadata.title);
      setArtist(initialMetadata.artist);
    }
  }, [initialMetadata]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !artist) {
      toast({
        title: "Error",
        description: "Title and artist are required",
        variant: "destructive",
      });
      return;
    }

    if (onSubmit) {
      onSubmit({ title, artist });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Song Details</DialogTitle>
            <DialogDescription>
              Enter the song title and artist name below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">Title *</label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter song title"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="artist" className="text-sm font-medium">Artist *</label>
              <Input
                id="artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Enter artist name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!title || !artist}>
              Upload Song
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}