import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { useAccount } from 'wagmi';
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Timer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { CreateRoomDialog } from "@/components/CreateRoomDialog";
import { formatDistanceToNow } from "date-fns";

interface Room {
  id: number;
  name: string;
  description: string | null;
  createdBy: string;
  isPrivate: boolean;
  currentSongId: number | null;
  createdAt: string;
  participantCount: number;
}

export default function Rooms() {
  const { address } = useAccount();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: rooms, isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    enabled: !!address,
  });

  const createRoomMutation = useMutation({
    mutationFn: async ({ name, description, isPrivate }: {
      name: string;
      description?: string;
      isPrivate?: boolean;
    }) => {
      const response = await apiRequest("POST", "/api/rooms", {
        name,
        description,
        isPrivate,
        address,
      });
      return response.json();
    },
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setCreateDialogOpen(false);
      setLocation(`/rooms/${room.id}`);
      toast({
        title: "Success",
        description: "Room created successfully!",
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
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Listening Rooms</h1>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Room
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading rooms...</p>
        ) : rooms?.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground mb-4">No listening rooms available</p>
            <Button onClick={() => setCreateDialogOpen(true)}>Create Your First Room</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms?.map((room) => (
              <Card
                key={room.id}
                className="p-4 hover:border-primary transition-colors cursor-pointer"
                onClick={() => setLocation(`/rooms/${room.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-xl font-semibold">{room.name}</h2>
                  {room.isPrivate && (
                    <Badge variant="secondary">Private</Badge>
                  )}
                </div>

                {room.description && (
                  <p className="text-muted-foreground text-sm mb-4">{room.description}</p>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {room.participantCount} listening
                  </div>
                  <div className="flex items-center">
                    <Timer className="h-4 w-4 mr-1" />
                    {formatDistanceToNow(new Date(room.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateRoomDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={({ name, description, isPrivate }) => {
          createRoomMutation.mutate({ name, description, isPrivate });
        }}
      />
    </Layout>
  );
}
