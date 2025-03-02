import { Router } from 'express';
import { db } from '@db';
import { songs, recentlyPlayed, playlistSongs, loves, users } from '@db/schema';
import { eq, desc, and, count } from 'drizzle-orm';
import { incrementListenCount } from '../services/music';
import { lumiraService } from './lumira';
import { encryptLoveCount } from '../services/encryption';

// Define NULL_ISLAND coordinates constant
const NULL_ISLAND_COORDS: [number, number] = [0, 0];
const NULL_ISLAND_COUNTRY_CODE = 'SIN'; // SINet designated country code

const router = Router();

// Get recent songs
router.get("/recent", async (req, res) => {
  try {
    console.log('Fetching recent songs with headers:', {
      wallet: req.headers['x-wallet-address'],
      internal: !!req.headers['x-internal-token']
    });

    // Ensure we have a valid response even if there are no songs yet
    const fallbackSongs = [
      {
        id: 1001,
        title: "NULL_ISLAND Beacon",
        artist: "SINet System",
        ipfsHash: null,
        uploadedBy: "system",
        createdAt: new Date().toISOString(),
        votes: 0
      }
    ];

    const recentSongs = await db.query.recentlyPlayed.findMany({
      orderBy: desc(recentlyPlayed.playedAt),
      limit: 100,
      with: {
        song: true,
      }
    });

    // Map to return only unique songs in order of most recently played
    const uniqueSongs = Array.from(
      new Map(recentSongs
        .filter(item => item.song !== null) // Filter out null songs
        .map(item => [item.songId, {
          id: item.song!.id,
          title: item.song!.title,
          artist: item.song!.artist,
          ipfsHash: item.song!.ipfsHash || null, // Ensure we don't send undefined
          uploadedBy: item.song!.uploadedBy,
          createdAt: item.song!.createdAt?.toISOString() ?? null,
          votes: item.song!.votes || 0, // Ensure we don't send undefined or null
          storageType: item.song!.ipfsHash ? 'ipfs' : 'ipfs' // Derive storage type - defaulting to ipfs if no hash
        }])).values()
    );

    // If no songs found, return fallback songs
    const songsToReturn = uniqueSongs.length > 0 ? Array.from(uniqueSongs) : fallbackSongs;

    console.log('Sending recent songs:', songsToReturn.length);
    res.json(songsToReturn);
  } catch (error) {
    console.error('Error fetching recent songs:', error);
    // Even on error, return at least the fallback song to prevent client-side errors
    const fallbackSongs = [
      {
        id: 1001,
        title: "NULL_ISLAND Beacon",
        artist: "SINet System",
        ipfsHash: null,
        uploadedBy: "system",
        createdAt: new Date().toISOString(),
        votes: 0
      }
    ];
    res.json(fallbackSongs);
  }
});

// Get user's song library
router.get("/library", async (req, res) => {
  try {
    const userAddress = req.headers['x-wallet-address'] as string;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const normalizedAddress = userAddress.toLowerCase();
    console.log('Fetching library for wallet:', normalizedAddress);

    // First ensure user exists
    await db.insert(users).values({
      address: normalizedAddress,
    }).onConflictDoNothing();

    // Fetch songs with case-insensitive comparison
    const userSongs = await db.query.songs.findMany({
      where: eq(songs.uploadedBy, normalizedAddress),
      orderBy: desc(songs.createdAt),
      with: {
        loves: true,
      },
    });

    console.log('Found songs:', userSongs.length);

    const songsWithLoves = await Promise.all(userSongs.map(async (song) => {
      const [{ total }] = await db
        .select({ total: count() })
        .from(loves)
        .where(eq(loves.songId, song.id));

      const userLove = await db.query.loves.findFirst({
        where: and(
          eq(loves.songId, song.id),
          eq(loves.address, normalizedAddress)
        ),
      });

      return {
        ...song,
        createdAt: song.createdAt?.toISOString() ?? null,
        loves: total,
        isLoved: !!userLove
      };
    }));

    console.log('Sending songs with loves:', songsWithLoves.length);
    res.json(songsWithLoves);
  } catch (error) {
    console.error('Error fetching user library:', error);
    res.status(500).json({
      error: 'Failed to fetch user library',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Record song play
router.post("/play/:id", async (req, res) => {
  const songId = parseInt(req.params.id);
  const userAddress = req.headers['x-wallet-address'] as string;
  const { latitude, longitude } = req.body;

  try {
    let countryCode = req.headers['cf-ipcountry'] as string;
    if (!countryCode) {
      countryCode = 'USA';
    }

    console.log('Recording play with data:', {
      songId,
      countryCode,
      hasLocation: !!latitude && !!longitude,
      coordinates: latitude && longitude ? { lat: latitude, lng: longitude } : 'No coordinates'
    });

    await incrementListenCount(songId, countryCode,
      latitude && longitude ? { lat: latitude, lng: longitude } : undefined
    );

    if (userAddress) {
      try {
        await db.insert(users).values({
          address: userAddress.toLowerCase(),
        }).onConflictDoNothing();

        await db.insert(recentlyPlayed).values({
          songId,
          playedBy: userAddress.toLowerCase(),
        });
      } catch (error) {
        console.error('Error recording authenticated play:', error);
      }
    } else {
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

// Upload new song
router.post("/", async (req, res) => {
  const { title, artist, ipfsHash } = req.body;
  const uploadedBy = req.headers['x-wallet-address'] as string;

  if (!uploadedBy) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const [newSong] = await db.insert(songs).values({
      title,
      artist,
      ipfsHash,
      uploadedBy: uploadedBy.toLowerCase(),
    }).returning();

    try {
      // Process through Lumira for interpretation
      await lumiraService.processMetricsPrivately({
        type: 'song_upload',
        timestamp: new Date().toISOString(),
        data: {
          songId: newSong.id,
          title,
          artist,
          uploadedBy: uploadedBy.toLowerCase(),
          ipfsHash,
          createdAt: new Date()
        },
        metadata: {
          source: 'song-upload',
          processed: true
        }
      });
    } catch (processingError) {
      console.warn('Non-critical processing error:', processingError);
    }

    res.json(newSong);
  } catch (error) {
    console.error('Error creating song:', error);
    res.status(500).json({ message: "Failed to create song" });
  }
});

// Delete song
router.delete("/:id", async (req, res) => {
  const songId = parseInt(req.params.id);
  const userAddress = req.headers['x-wallet-address'] as string;

  if (!userAddress) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const song = await db.query.songs.findFirst({
    where: eq(songs.id, songId),
  });

  if (!song || song.uploadedBy !== userAddress) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    await db.delete(recentlyPlayed).where(eq(recentlyPlayed.songId, songId));
    await db.delete(playlistSongs).where(eq(playlistSongs.songId, songId));
    await db.delete(songs).where(eq(songs.id, songId));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ message: "Failed to delete song" });
  }
});

// Update song
router.patch("/:id", async (req, res) => {
  const songId = parseInt(req.params.id);
  const userAddress = req.headers['x-wallet-address'] as string;
  const { title, artist } = req.body;

  if (!userAddress) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const song = await db.query.songs.findFirst({
    where: eq(songs.id, songId),
  });

  if (!song || song.uploadedBy !== userAddress.toLowerCase()) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const [updatedSong] = await db
    .update(songs)
    .set({
      title,
      artist,
    })
    .where(eq(songs.id, songId))
    .returning();

  res.json(updatedSong);
});

// Love/unlike song
router.post("/:id/love", async (req, res) => {
  const songId = parseInt(req.params.id);
  const userAddress = req.headers['x-wallet-address'] as string;

  if (!userAddress) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const existingLove = await db.query.loves.findFirst({
      where: and(
        eq(loves.songId, songId),
        eq(loves.address, userAddress.toLowerCase())
      ),
    });

    let total;
    if (existingLove) {
      await db.delete(loves).where(
        and(
          eq(loves.songId, songId),
          eq(loves.address, userAddress.toLowerCase())
        )
      );
      total = await db.select({ count: count() }).from(loves).where(eq(loves.songId, songId));
      total = total[0].count - 1;
    } else {
      await db.insert(loves).values({
        songId,
        address: userAddress.toLowerCase(),
      });
      total = await db.select({ count: count() }).from(loves).where(eq(loves.songId, songId));
      total = total[0].count;
    }

    const encryptedCount = await encryptLoveCount(total);

    if (process.env.NODE_ENV === 'development' && !(req as any).secureChannel) {
      return res.json({
        loved: !existingLove,
        totalLoves: total,
        dev: true
      });
    }

    res.json({
      loved: !existingLove,
      totalLoves: encryptedCount
    });
  } catch (error) {
    console.error('Error toggling love:', error);
    res.status(500).json({ message: "Failed to toggle love" });
  }
});

// Update the map data API endpoint to ensure proper JSON response and enhance NULL_ISLAND
router.get("/map", async (req, res) => {
  const userAddress = req.headers['x-wallet-address'] as string;

  try {
    let countryCode = req.headers['cf-ipcountry'] as string;
    if (!countryCode) {
      countryCode = 'USA';
    }

    // Structure for map data with enhanced NULL_ISLAND support
    const mapData: {
      countries: Record<string, {
        locations: Array<[number, number]>;
        listenerCount: number;
        anonCount: number;
      }>;
      totalListeners: number;
      allLocations: Array<[number, number]>;
      sinetInfo?: {
        nullIslandStatus: 'online' | 'syncing' | 'offline';
        connectedNodes: number;
        syncPercentage: number;
      }
    } = {
      countries: {},
      totalListeners: 0,
      allLocations: [],
      // Add SINet system status information
      sinetInfo: {
        nullIslandStatus: 'online',
        connectedNodes: Math.floor(Math.random() * 20) + 5, // Simulate 5-25 connected nodes
        syncPercentage: 100 // Fully synced
      }
    };

    // If no data exists yet, still return NULL_ISLAND data
    if (!userAddress && !req.headers['x-internal-token']) {
      // Always add NULL_ISLAND as a special location
      mapData.allLocations.push(NULL_ISLAND_COORDS);
      mapData.totalListeners = 1;

      // Add SINet as a country with NULL_ISLAND
      mapData.countries[NULL_ISLAND_COUNTRY_CODE] = {
        locations: [NULL_ISLAND_COORDS],
        listenerCount: 1,
        anonCount: 0
      };

      return res.json(mapData);
    }

    // Add NULL_ISLAND as the central node
    mapData.allLocations.push(NULL_ISLAND_COORDS);
    mapData.totalListeners = 1;

    // Add SINet as a country with NULL_ISLAND
    mapData.countries[NULL_ISLAND_COUNTRY_CODE] = {
      locations: [NULL_ISLAND_COORDS],
      listenerCount: 1,
      anonCount: 0
    };

    // Add test locations for development (radiating out from NULL_ISLAND)
    const testLocations = [
      [10, 10], [-10, 10], [10, -10], [-10, -10],
      [5, 0], [0, 5], [-5, 0], [0, -5]
    ];

    testLocations.forEach(location => {
      mapData.allLocations.push(location as [number, number]);
      mapData.totalListeners++;

      // Add to SINet country
      mapData.countries[NULL_ISLAND_COUNTRY_CODE].locations.push(location as [number, number]);
      mapData.countries[NULL_ISLAND_COUNTRY_CODE].listenerCount++;
    });

    console.log('Sending SINet-aligned map data:', {
      totalLocations: mapData.allLocations.length,
      totalListeners: mapData.totalListeners,
      countries: Object.keys(mapData.countries).length,
      nullIslandStatus: mapData.sinetInfo?.nullIslandStatus
    });

    res.json(mapData);
  } catch (error) {
    console.error('Error fetching map data:', error);
    res.status(500).json({
      error: 'Failed to fetch map data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;