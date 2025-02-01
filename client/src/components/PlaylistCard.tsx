import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Plus } from "lucide-react";

interface PlaylistCardProps {
  title: string;
  songCount: number;
  image?: string;
  onPlay: () => void;
  onAddSong: () => void;
}

export function PlaylistCard({ title, songCount, image, onPlay, onAddSong }: PlaylistCardProps) {
  return (
    <Card className="overflow-hidden group hover:bg-accent transition-colors">
      <CardHeader className="relative p-0">
        <div className="aspect-square overflow-hidden">
          <img
            src={image || "https://images.unsplash.com/photo-1734552452939-7d9630889748"}
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
        <CardTitle className="text-lg mb-1">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{songCount} songs</p>
      </CardContent>
    </Card>
  );
}
