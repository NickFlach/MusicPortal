import { Router } from 'express';
import { db } from '@db';
import { listeningRooms, roomParticipants, roomChatMessages, users } from '@db/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

router.post('/api/rooms', async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    const createdBy = req.body.address;

    if (!name) {
      return res.status(400).json({ message: "Room name is required" });
    }

    // Create new room
    const [room] = await db.insert(listeningRooms)
      .values({
        name,
        description,
        isPrivate: isPrivate || false,
        createdBy,
      })
      .returning();

    // Add creator as host participant
    await db.insert(roomParticipants)
      .values({
        roomId: room.id,
        userAddress: createdBy,
        isHost: true,
      });

    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ message: "Failed to create room" });
  }
});

router.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await db.select({
      id: listeningRooms.id,
      name: listeningRooms.name,
      description: listeningRooms.description,
      createdBy: listeningRooms.createdBy,
      isPrivate: listeningRooms.isPrivate,
      currentSongId: listeningRooms.currentSongId,
      createdAt: listeningRooms.createdAt,
      participantCount: db.select().from(roomParticipants)
        .where(eq(roomParticipants.roomId, listeningRooms.id))
        .count().as('participant_count'),
    })
    .from(listeningRooms)
    .orderBy(desc(listeningRooms.createdAt));

    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
});

router.get('/api/rooms/:id', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const [room] = await db.select()
      .from(listeningRooms)
      .where(eq(listeningRooms.id, roomId))
      .limit(1);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const participants = await db.select({
      address: roomParticipants.userAddress,
      isHost: roomParticipants.isHost,
      joinedAt: roomParticipants.joinedAt,
      username: users.username,
    })
    .from(roomParticipants)
    .leftJoin(users, eq(users.address, roomParticipants.userAddress))
    .where(eq(roomParticipants.roomId, roomId));

    const recentMessages = await db.select({
      id: roomChatMessages.id,
      message: roomChatMessages.message,
      userAddress: roomChatMessages.userAddress,
      createdAt: roomChatMessages.createdAt,
      username: users.username,
    })
    .from(roomChatMessages)
    .leftJoin(users, eq(users.address, roomChatMessages.userAddress))
    .where(eq(roomChatMessages.roomId, roomId))
    .orderBy(desc(roomChatMessages.createdAt))
    .limit(50);

    res.json({
      ...room,
      participants,
      recentMessages: recentMessages.reverse(),
    });
  } catch (error) {
    console.error('Error fetching room details:', error);
    res.status(500).json({ message: "Failed to fetch room details" });
  }
});

export default router;
