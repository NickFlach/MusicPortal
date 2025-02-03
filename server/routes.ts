import type { Express } from "express";
import { createServer } from "http";
import { db } from "@db";
import { songs, users, recentlyPlayed } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import radioRouter from './routes/radio';

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Register radio routes
  app.use(radioRouter);

  app.get("/api/songs/recent", async (req, res) => {
    const recentSongs = await db.query.recentlyPlayed.findMany({
      orderBy: desc(recentlyPlayed.playedAt),
      limit: 20,
      with: {
        song: true,
      }
    });

    // Map to return only unique songs in order of most recently played
    const uniqueSongs = Array.from(
      new Map(recentSongs.map(item => [item.songId, item.song])).values()
    );

    res.json(uniqueSongs);
  });

  app.get("/api/songs/library", async (req, res) => {
    const userAddress = req.headers['x-wallet-address'] as string;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Convert both addresses to lowercase for case-insensitive comparison
    const userSongs = await db.query.songs.findMany({
      where: eq(songs.uploadedBy, userAddress.toLowerCase()),
      orderBy: desc(songs.createdAt),
    });

    res.json(userSongs);
  });

  app.post("/api/songs/play/:id", async (req, res) => {
    const songId = parseInt(req.params.id);
    const userAddress = req.headers['x-wallet-address'] as string;

    try {
      // If user is authenticated, ensure they're registered first
      if (userAddress) {
        // Check if user exists
        const existingUser = await db.query.users.findFirst({
          where: eq(users.address, userAddress.toLowerCase()),
        });

        // If user doesn't exist, register them
        if (!existingUser) {
          await db.insert(users).values({
            address: userAddress.toLowerCase(),
            isAdmin: false,
          });
        }

        // Now record the play
        await db.insert(recentlyPlayed).values({
          songId,
          playedBy: userAddress.toLowerCase(),
        });
      }
      // For anonymous plays from landing page, just record the song
      else {
        await db.insert(recentlyPlayed).values({
          songId,
          playedBy: null,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error recording play:', error);
      res.status(500).json({ message: "Failed to record play" });
    }
  });

  app.post("/api/songs", async (req, res) => {
    const { title, artist, ipfsHash, albumArtIpfsHash, albumName, genre, releaseYear, description, license, bpm, key, tags, isExplicit } = req.body;
    const uploadedBy = req.headers['x-wallet-address'] as string;

    if (!uploadedBy) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const newSong = await db.insert(songs).values({
      title,
      artist,
      ipfsHash,
      uploadedBy,
      albumArtIpfsHash,
      albumName,
      genre,
      releaseYear,
      description,
      license,
      bpm,
      key,
      tags,
      isExplicit,
    }).returning();

    res.json(newSong[0]);
  });

  app.patch("/api/songs/:id", async (req, res) => {
    const songId = parseInt(req.params.id);
    const userAddress = req.headers['x-wallet-address'] as string;
    const { title, artist, albumArtIpfsHash, albumName, genre, releaseYear, description, license, bpm, key, tags, isExplicit } = req.body;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if the song belongs to the user
    const song = await db.query.songs.findFirst({
      where: eq(songs.id, songId),
    });

    if (!song || song.uploadedBy !== userAddress.toLowerCase()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Update the song
    const [updatedSong] = await db
      .update(songs)
      .set({
        title,
        artist,
        albumArtIpfsHash,
        albumName,
        genre,
        releaseYear,
        description,
        license,
        bpm,
        key,
        tags,
        isExplicit,
      })
      .where(eq(songs.id, songId))
      .returning();

    res.json(updatedSong);
  });

  app.delete("/api/songs/:id", async (req, res) => {
    const songId = parseInt(req.params.id);
    const userAddress = req.headers['x-wallet-address'] as string;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if the song belongs to the user
    const song = await db.query.songs.findFirst({
      where: eq(songs.id, songId),
    });

    if (!song || song.uploadedBy !== userAddress) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      await db.delete(recentlyPlayed).where(eq(recentlyPlayed.songId, songId));
      await db.delete(songs).where(eq(songs.id, songId));

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting song:', error);
      res.status(500).json({ message: "Failed to delete song" });
    }
  });

  // Users
  app.post("/api/users/register", async (req, res) => {
    const address = req.headers['x-wallet-address'] as string;

    if (!address) {
      return res.status(400).json({ message: "Wallet address is required" });
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.address, address),
    });

    if (existingUser) {
      return res.json(existingUser);
    }

    // Create new user
    const newUser = await db.insert(users).values({
      address,
      isAdmin: false,
    }).returning();

    res.json(newUser[0]);
  });

  return httpServer;
}