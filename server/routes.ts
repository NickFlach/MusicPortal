import type { Express } from "express";
import { createServer } from "http";
import { db } from "@db";
import { songs, users, playlists, followers, playlistSongs, recentlyPlayed, userRewards } from "@db/schema";
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
      // Delete in order: recently_played, playlist_songs, then songs
      await db.delete(recentlyPlayed).where(eq(recentlyPlayed.songId, songId));
      await db.delete(playlistSongs).where(eq(playlistSongs.songId, songId));
      await db.delete(songs).where(eq(songs.id, songId));

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting song:', error);
      res.status(500).json({ message: "Failed to delete song" });
    }
  });

  // Playlists
  app.get("/api/playlists", async (req, res) => {
    const userAddress = req.headers['x-wallet-address'] as string;
    const userPlaylists = await db.query.playlists.findMany({
      where: userAddress ? eq(playlists.createdBy, userAddress) : undefined,
      orderBy: desc(playlists.createdAt),
      with: {
        playlistSongs: {
          with: {
            song: true,
          },
        },
      },
    });
    res.json(userPlaylists);
  });

  app.post("/api/playlists", async (req, res) => {
    const { name } = req.body;
    const userAddress = req.headers['x-wallet-address'] as string;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const newPlaylist = await db.insert(playlists).values({
      name,
      createdBy: userAddress,
    }).returning();

    res.json(newPlaylist[0]);
  });

  app.post("/api/playlists/:playlistId/songs", async (req, res) => {
    const { playlistId } = req.params;
    const { songId } = req.body;
    const userAddress = req.headers['x-wallet-address'] as string;

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

  // Treasury Management
  app.get("/api/admin/treasury", async (req, res) => {
    const userAddress = req.headers['x-wallet-address'] as string;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [user] = await db.query.users.findMany({
      where: eq(users.address, userAddress),
    });

    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Get reward statistics
    const rewardedUsers = await db.query.userRewards.findMany();
    const totalRewards = rewardedUsers.reduce((total, user) => {
      return total + (user.uploadRewardClaimed ? 1 : 0) +
                    (user.playlistRewardClaimed ? 2 : 0) +
                    (user.nftRewardClaimed ? 3 : 0);
    }, 0);

    // Get treasury data from environment
    const treasuryAddress = process.env.TREASURY_ADDRESS;

    res.json({
      address: treasuryAddress,
      totalRewards,
      rewardedUsers: rewardedUsers.length,
    });
  });

  app.post("/api/admin/treasury", async (req, res) => {
    const userAddress = req.headers['x-wallet-address'] as string;
    const { address } = req.body;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [user] = await db.query.users.findMany({
      where: eq(users.address, userAddress),
    });

    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Update treasury address in environment
    process.env.TREASURY_ADDRESS = address;

    res.json({ success: true });
  });

  // User rewards tracking
  app.post("/api/rewards/claim", async (req, res) => {
    const userAddress = req.headers['x-wallet-address'] as string;
    const { type } = req.body;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get or create user rewards
    let [userReward] = await db.query.userRewards.findMany({
      where: eq(userRewards.address, userAddress),
    });

    if (!userReward) {
      [userReward] = await db.insert(userRewards)
        .values({ address: userAddress })
        .returning();
    }

    // Check if reward already claimed
    const rewardField = `${type}RewardClaimed` as keyof typeof userReward;
    if (userReward[rewardField]) {
      return res.status(400).json({ message: "Reward already claimed" });
    }

    // Update reward status
    await db.update(userRewards)
      .set({ [rewardField]: true })
      .where(eq(userRewards.address, userAddress));

    res.json({ success: true });
  });

  return httpServer;
}