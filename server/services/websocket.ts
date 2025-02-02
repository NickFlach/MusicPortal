import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import { db } from '@db';
import { listeningRooms, roomParticipants, roomChatMessages } from '@db/schema';
import { eq, and } from 'drizzle-orm';

interface RoomState {
  participants: Set<WebSocket>;
  currentSong: {
    id: number;
    position: number;
    isPlaying: boolean;
  } | null;
}

export class ListeningRoomService {
  private rooms: Map<number, RoomState> = new Map();
  private wss: WebSocketServer;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/listening-room',
    });

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  private handleConnection(ws: WebSocket) {
    let roomId: number | null = null;
    let userAddress: string | null = null;

    ws.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data);

        switch (message.type) {
          case 'join':
            roomId = message.roomId;
            userAddress = message.userAddress;
            await this.handleJoin(ws, roomId, userAddress);
            break;

          case 'leave':
            if (roomId && userAddress) {
              await this.handleLeave(ws, roomId, userAddress);
            }
            break;

          case 'chat':
            if (roomId && userAddress) {
              await this.handleChat(roomId, userAddress, message.content);
            }
            break;

          case 'sync':
            if (roomId) {
              await this.handleSync(roomId, message.songId, message.position, message.isPlaying);
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', async () => {
      if (roomId && userAddress) {
        await this.handleLeave(ws, roomId, userAddress);
      }
    });
  }

  private async handleJoin(ws: WebSocket, roomId: number, userAddress: string) {
    // Add user to room participants in database
    await db.insert(roomParticipants).values({
      roomId,
      userAddress,
    });

    // Initialize room state if it doesn't exist
    if (!this.rooms.has(roomId)) {
      const [room] = await db.select()
        .from(listeningRooms)
        .where(eq(listeningRooms.id, roomId));

      this.rooms.set(roomId, {
        participants: new Set(),
        currentSong: room ? {
          id: room.currentSongId!,
          position: room.songPosition,
          isPlaying: room.isPlaying,
        } : null,
      });
    }

    // Add websocket to room participants
    const roomState = this.rooms.get(roomId)!;
    roomState.participants.add(ws);

    // Send current room state to the new participant
    ws.send(JSON.stringify({
      type: 'room_state',
      data: roomState.currentSong,
    }));

    // Notify other participants
    this.broadcast(roomId, {
      type: 'user_joined',
      userAddress,
    }, ws);
  }

  private async handleLeave(ws: WebSocket, roomId: number, userAddress: string) {
    // Remove from database
    await db.delete(roomParticipants)
      .where(
        and(
          eq(roomParticipants.roomId, roomId),
          eq(roomParticipants.userAddress, userAddress)
        )
      );

    // Remove from memory
    const roomState = this.rooms.get(roomId);
    if (roomState) {
      roomState.participants.delete(ws);
      
      // If room is empty, clean up
      if (roomState.participants.size === 0) {
        this.rooms.delete(roomId);
      } else {
        // Notify other participants
        this.broadcast(roomId, {
          type: 'user_left',
          userAddress,
        }, ws);
      }
    }
  }

  private async handleChat(roomId: number, userAddress: string, content: string) {
    // Store chat message
    await db.insert(roomChatMessages).values({
      roomId,
      userAddress,
      message: content,
    });

    // Broadcast to room
    this.broadcast(roomId, {
      type: 'chat',
      userAddress,
      content,
    });
  }

  private async handleSync(roomId: number, songId: number, position: number, isPlaying: boolean) {
    // Update room state in database
    await db.update(listeningRooms)
      .set({
        currentSongId: songId,
        songPosition: position,
        isPlaying,
        updatedAt: new Date(),
      })
      .where(eq(listeningRooms.id, roomId));

    // Update in memory
    const roomState = this.rooms.get(roomId);
    if (roomState) {
      roomState.currentSong = { id: songId, position, isPlaying };
    }

    // Broadcast to room
    this.broadcast(roomId, {
      type: 'sync',
      songId,
      position,
      isPlaying,
    });
  }

  private broadcast(roomId: number, message: any, exclude?: WebSocket) {
    const roomState = this.rooms.get(roomId);
    if (!roomState) return;

    const messageStr = JSON.stringify(message);
    for (const participant of roomState.participants) {
      if (participant !== exclude && participant.readyState === WebSocket.OPEN) {
        participant.send(messageStr);
      }
    }
  }
}
