import type { Express } from "express";
import { createServer } from "http";
import { db } from "@db";
import { songs, users, playlists, votes, followers, playlistSongs, recentlyPlayed } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Songs
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

    const userSongs = await db.query.songs.findMany({
      where: eq(songs.uploadedBy, userAddress),
      orderBy: desc(songs.createdAt),
    });

    res.json(userSongs);
  });

  app.post("/api/songs/play/:id", async (req, res) => {
    const songId = parseInt(req.params.id);
    const userAddress = req.headers['x-wallet-address'] as string;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Record play in recently played
    await db.insert(recentlyPlayed).values({
      songId,
      playedBy: userAddress,
    });

    res.json({ success: true });
  });

  app.post("/api/songs", async (req, res) => {
    const { title, artist, ipfsHash } = req.body;
    const uploadedBy = req.headers['x-wallet-address'] as string;

    if (!uploadedBy) {
      return res.status(401).json({ message: "Unauthorized" });
    }

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
  
  app.post("/api/playlists/:playlistId/songs", async (req, res) => {
    const { playlistId } = req.params;
    const { songId } = req.body;
    const userAddress = req.user?.address;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get the playlist to check ownership
    const playlist = await db.query.playlists.findFirst({
      where: eq(playlists.id, parseInt(playlistId)),
    });

    if (!playlist || playlist.createdBy !== userAddress) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Get current max position
    const currentSongs = await db.query.playlistSongs.findMany({
      where: eq(playlistSongs.playlistId, parseInt(playlistId)),
      orderBy: desc(playlistSongs.position),
    });

    const nextPosition = currentSongs.length > 0 ? currentSongs[0].position + 1 : 0;

    // Add song to playlist
    await db.insert(playlistSongs).values({
      playlistId: parseInt(playlistId),
      songId: parseInt(songId),
      position: nextPosition,
    });

    res.json({ success: true });
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

  // Social Features
  app.post("/api/social/follow/:address", async (req, res) => {
    const userAddress = req.user?.address;
    const targetAddress = req.params.address;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (userAddress === targetAddress) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    await db.insert(followers).values({
      followerId: userAddress,
      followingId: targetAddress,
    });

    res.json({ success: true });
  });

  app.post("/api/social/unfollow/:address", async (req, res) => {
    const userAddress = req.user?.address;
    const targetAddress = req.params.address;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await db.delete(followers)
      .where(
        and(
          eq(followers.followerId, userAddress),
          eq(followers.followingId, targetAddress)
        )
      );

    res.json({ success: true });
  });

  app.get("/api/social/feed", async (req, res) => {
    const userAddress = req.user?.address;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const followingUsers = await db.query.followers.findMany({
      where: eq(followers.followerId, userAddress),
      with: {
        following: {
          with: {
            playlists: true,
          },
        },
      },
    });

    const feed = followingUsers.flatMap(f => f.following.playlists)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(feed);
  });
  return httpServer;
}