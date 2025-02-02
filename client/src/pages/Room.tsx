import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Layout } from "@/components/Layout";
import { useAccount } from 'wagmi';
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Users, MessageSquare, Music } from "lucide-react";

interface Room {
  id: number;
  name: string;
  description: string | null;
  createdBy: string;
  currentSongId: number | null;
  songPosition: number;
  isPlaying: boolean;
  participants: {
    address: string;
    username: string | null;
    isHost: boolean;
    joinedAt: string;
  }[];
  recentMessages: {
    id: number;
    message: string;
    userAddress: string;
    username: string | null;
    createdAt: string;
  }[];
}

export default function Room() {
  const { address } = useAccount();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [message, setMessage] = useState("");
  const { currentTrack, play, pause, seek } = useMusicPlayer();
  
  const { data: room, isLoading } = useQuery<Room>({
    queryKey: [`/api/rooms/${id}`],
    enabled: !!address && !!id,
  });

  useEffect(() => {
    if (!address || !id) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/listening-room`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join',
        roomId: parseInt(id),
        userAddress: address,
      }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'user_joined':
        case 'user_left':
          // Trigger room refetch to update participants
          break;
        
        case 'chat':
          // Add message to chat
          break;
        
        case 'sync':
          if (data.songId && currentTrack?.id !== data.songId) {
            // Load and play the new song
            play(data.songId);
          }
          
          if (Math.abs(currentTrack?.position - data.position) > 2) {
            seek(data.position);
          }
          
          if (data.isPlaying) {
            play();
          } else {
            pause();
          }
          break;

        case 'room_state':
          if (data.currentSong) {
            play(data.currentSong.id);
            seek(data.currentSong.position);
            if (!data.currentSong.isPlaying) {
              pause();
            }
          }
          break;
      }
    };

    socket.onclose = () => {
      toast({
        title: "Connection lost",
        description: "Attempting to reconnect...",
      });
    };

    setWs(socket);
    return () => {
      socket.close();
    };
  }, [address, id, play, pause, seek, currentTrack, toast]);

  const handleSendMessage = () => {
    if (!ws || !message.trim()) return;

    ws.send(JSON.stringify({
      type: 'chat',
      content: message.trim(),
    }));

    setMessage("");
  };

  if (isLoading || !room) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Room Info */}
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold mb-2">{room.name}</h1>
            {room.description && (
              <p className="text-muted-foreground mb-6">{room.description}</p>
            )}
            
            {/* Currently Playing */}
            <Card className="mb-6">
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <Music className="h-8 w-8 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold">
                      {currentTrack ? currentTrack.title : 'No song playing'}
                    </h2>
                    {currentTrack && (
                      <p className="text-muted-foreground">{currentTrack.artist}</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Participants */}
          <Card className="h-min">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5" />
                <h3 className="font-medium">Participants ({room.participants.length})</h3>
              </div>
              <div className="space-y-2">
                {room.participants.map((participant) => (
                  <div
                    key={participant.address}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {participant.username || participant.address.slice(0, 6)}
                      {participant.isHost && (
                        <span className="ml-2 text-xs text-primary">(Host)</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(participant.joinedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Chat */}
          <div className="lg:col-span-3">
            <Card>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="h-5 w-5" />
                  <h3 className="font-medium">Chat</h3>
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {room.recentMessages.map((msg) => (
                      <div key={msg.id} className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {msg.username || msg.userAddress.slice(0, 6)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(msg.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Separator className="my-4" />

                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button onClick={handleSendMessage}>Send</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
