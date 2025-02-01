import type { Express } from "express";
import { createServer } from "http";
import { db } from "@db";
import { songs, users, playlists, votes } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Songs
  app.get("/api/songs", async (req, res) => {
    const allSongs = await db.query.songs.findMany({
      orderBy: desc(songs.createdAt),
    });
    res.json(allSongs);
  });

  app.post("/api/songs", async (req, res) => {
    const { title, artist, ipfsHash } = req.body;
    const uploadedBy = req.user?.address;

    const newSong = await db.insert(songs).values({
      title,
      artist,
      ipfsHash,
      uploadedBy,
    }).returning();

    res.json(newSong[0]);
  });

  // Playlists
  app.get("/api/playlists", async (req, res) => {
    const userPlaylists = await db.query.playlists.findMany({
      orderBy: desc(playlists.createdAt),
    });
    res.json(userPlaylists);
  });

  app.post("/api/playlists", async (req, res) => {
    const { name } = req.body;
    const createdBy = req.user?.address;

    const newPlaylist = await db.insert(playlists).values({
      name,
      createdBy,
    }).returning();

    res.json(newPlaylist[0]);
  });

  // Votes
  app.post("/api/votes/:songId", async (req, res) => {
    const { songId } = req.params;
    const address = req.user?.address;

    if (!address) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await db.insert(votes).values({
      songId: parseInt(songId),
      address,
    });

    await db.update(songs)
      .set({ votes: (songs.votes + 1) })
      .where(eq(songs.id, parseInt(songId)));

    res.json({ success: true });
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    const user = await db.query.users.findFirst({
      where: eq(users.address, req.user?.address || ""),
    });

    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const allUsers = await db.query.users.findMany();
    res.json(allUsers);
  });

  app.post("/api/admin/toggle/:address", async (req, res) => {
    const user = await db.query.users.findFirst({
      where: eq(users.address, req.user?.address || ""),
    });

    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const targetUser = await db.query.users.findFirst({
      where: eq(users.address, req.params.address),
    });

    if (targetUser) {
      await db.update(users)
        .set({ isAdmin: !targetUser.isAdmin })
        .where(eq(users.address, req.params.address));
    }

    res.json({ success: true });
  });

  // Treasury routes
  app.get("/api/treasury/balance", async (_req, res) => {
    // Mock implementation - replace with actual Web3 calls
    res.json({
      pfork: 1000000,
      neo: 1000,
      voteWeight: 500,
    });
  });

  return httpServer;
}
