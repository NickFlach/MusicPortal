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

interface Song {
  id: number;
  title: string;
  artist: string;
  ipfsHash: string;
}

interface EditSongDialogProps {
  song?: Song;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'edit' | 'create';
  onSubmit?: (data: { title: string; artist: string }) => void;
  initialMetadata?: {
    title: string;
    artist: string;
  };
}

export function EditSongDialog({ 
  song, 
  open, 
  onOpenChange,
  mode,
  onSubmit,
  initialMetadata 
}: EditSongDialogProps) {
  const [title, setTitle] = React.useState(initialMetadata?.title || song?.title || '');
  const [artist, setArtist] = React.useState(initialMetadata?.artist || song?.artist || '');
  const { toast } = useToast();

  React.useEffect(() => {
    if (initialMetadata && mode === 'create') {
      setTitle(initialMetadata.title);
      setArtist(initialMetadata.artist);
    }
  }, [initialMetadata, mode]);

  React.useEffect(() => {
    if (song) {
      setTitle(song.title);
      setArtist(song.artist);
    }
  }, [song]);

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
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'edit' ? 'Edit Song Details' : 'New Song Details'}
            </DialogTitle>
            <DialogDescription>
              Enter the basic song information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title *
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter song title"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="artist" className="text-sm font-medium">
                Artist *
              </label>
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
              {mode === 'edit' ? 'Save Changes' : 'Upload Song'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}