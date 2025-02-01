import { Router } from 'express';
import { db } from '@db';
import { songs } from '@db/schema';
import { desc } from 'drizzle-orm';
import { generateRSSFeed } from '../services/rss';

const router = Router();

router.get('/api/feed.rss', async (req, res) => {
  try {
    // Get the latest songs
    const latestSongs = await db.select()
      .from(songs)
      .orderBy(desc(songs.createdAt))
      .limit(50);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const feed = generateRSSFeed(latestSongs, baseUrl);

    res.set('Content-Type', 'application/rss+xml');
    res.send(feed);
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    res.status(500).json({ error: 'Failed to generate RSS feed' });
  }
});

export default router;
