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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { uploadToIPFS } from "@/lib/ipfs";
import { Image as ImageIcon, Upload } from "lucide-react";

interface Song {
  id: number;
  title: string;
  artist: string;
  ipfsHash: string;
  albumArtIpfsHash?: string;
  albumName?: string;
  genre?: string;
  releaseYear?: number;
  description?: string;
  isExplicit?: boolean;
  license?: string;
  bpm?: number;
  key?: string;
  tags?: string;
}

interface EditSongDialogProps {
  song?: Song;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'edit' | 'create';
  onSubmit?: (data: { title: string; artist: string }) => void;
}

export function EditSongDialog({ 
  song, 
  open, 
  onOpenChange,
  mode,
  onSubmit 
}: EditSongDialogProps) {
  const [title, setTitle] = React.useState(song?.title || '');
  const [artist, setArtist] = React.useState(song?.artist || '');
  const [albumName, setAlbumName] = React.useState(song?.albumName || '');
  const [genre, setGenre] = React.useState(song?.genre || '');
  const [releaseYear, setReleaseYear] = React.useState(song?.releaseYear?.toString() || '');
  const [description, setDescription] = React.useState(song?.description || '');
  const [license, setLicense] = React.useState(song?.license || '');
  const [bpm, setBpm] = React.useState(song?.bpm?.toString() || '');
  const [key, setKey] = React.useState(song?.key || '');
  const [tags, setTags] = React.useState(song?.tags || '');
  const [isExplicit, setIsExplicit] = React.useState(song?.isExplicit || false);
  const [albumArt, setAlbumArt] = React.useState<File>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (song) {
      setTitle(song.title);
      setArtist(song.artist);
      setAlbumName(song.albumName || '');
      setGenre(song.genre || '');
      setReleaseYear(song.releaseYear?.toString() || '');
      setDescription(song.description || '');
      setLicense(song.license || '');
      setBpm(song.bpm?.toString() || '');
      setKey(song.key || '');
      setTags(song.tags || '');
      setIsExplicit(song.isExplicit || false);
    }
  }, [song]);

  const editSongMutation = useMutation({
    mutationFn: async (data: Partial<Song>) => {
      let albumArtIpfsHash = song?.albumArtIpfsHash;

      // Upload album art if provided
      if (albumArt) {
        try {
          albumArtIpfsHash = await uploadToIPFS(albumArt);
        } catch (error) {
          console.error('Failed to upload album art:', error);
          toast({
            title: "Error",
            description: "Failed to upload album art. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      const response = await apiRequest(
        "PATCH",
        `/api/songs/${song?.id}`,
        {
          ...data,
          albumArtIpfsHash,
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/songs/recent"] });
      toast({
        title: "Success",
        description: "Song updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

    const formData = {
      title,
      artist,
      albumName: albumName || undefined,
      genre: genre || undefined,
      releaseYear: releaseYear ? parseInt(releaseYear) : undefined,
      description: description || undefined,
      license: license || undefined,
      bpm: bpm ? parseInt(bpm) : undefined,
      key: key || undefined,
      tags: tags || undefined,
      isExplicit,
    };

    if (mode === 'edit') {
      editSongMutation.mutate(formData);
    } else if (onSubmit) {
      onSubmit({ title, artist });
      onOpenChange(false);
    }
  };

  const handleAlbumArtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setAlbumArt(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'edit' ? 'Edit Song Details' : 'New Song Details'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'edit' ? 'Update the song details and metadata.' : 'Enter the details for your new song.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="albumName" className="text-sm font-medium">Album</label>
                <Input
                  id="albumName"
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  placeholder="Enter album name"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="albumArt" className="text-sm font-medium">Album Art</label>
                <Input
                  id="albumArt"
                  type="file"
                  accept="image/*"
                  onChange={handleAlbumArtUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('albumArt')?.click()}
                  className="w-full"
                >
                  {albumArt ? (
                    <ImageIcon className="mr-2 h-4 w-4" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {albumArt ? 'Change Album Art' : 'Upload Album Art'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="genre" className="text-sm font-medium">Genre</label>
                <Input
                  id="genre"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="e.g., Rock, Jazz, Hip-Hop"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="releaseYear" className="text-sm font-medium">Release Year</label>
                <Input
                  id="releaseYear"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={releaseYear}
                  onChange={(e) => setReleaseYear(e.target.value)}
                  placeholder="YYYY"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter song description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="license" className="text-sm font-medium">License</label>
                <Input
                  id="license"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  placeholder="e.g., CC BY-SA 4.0"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="bpm" className="text-sm font-medium">BPM</label>
                <Input
                  id="bpm"
                  type="number"
                  min="1"
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                  placeholder="Beats per minute"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="key" className="text-sm font-medium">Musical Key</label>
                <Input
                  id="key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="e.g., C Major, A Minor"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="tags" className="text-sm font-medium">Tags</label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Comma-separated tags"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isExplicit"
                checked={isExplicit}
                onChange={(e) => setIsExplicit(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="isExplicit" className="text-sm font-medium">
                Contains explicit content
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={!title || !artist || editSongMutation.isPending}
            >
              {mode === 'edit' ? 'Save Changes' : 'Create Song'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}