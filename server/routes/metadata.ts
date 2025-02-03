import { Router } from 'express';
import { getMusicStats, getSongMetadata } from '../services/music';

const router = Router();

router.get('/api/music/stats', async (_req, res) => {
  try {
    const stats = await getMusicStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching music stats:', error);
    res.status(500).json({ error: 'Failed to fetch music stats' });
  }
});

router.get('/api/music/metadata/:id', async (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    const metadata = await getSongMetadata(songId);

    if (!metadata) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Set OpenGraph and Twitter Card meta tags in the response
    const metaTags = `
      <!-- OpenGraph Meta Tags -->
      <meta property="og:title" content="${metadata.openGraph.title}" />
      <meta property="og:description" content="${metadata.openGraph.description}" />
      <meta property="og:image" content="${metadata.openGraph.image}" />
      <meta property="og:type" content="${metadata.openGraph.type}" />
      ${metadata.openGraph.musician ? `<meta property="music:musician" content="${metadata.openGraph.musician}" />` : ''}
      ${metadata.openGraph.album ? `<meta property="music:album" content="${metadata.openGraph.album}" />` : ''}
      ${metadata.openGraph.duration ? `<meta property="music:duration" content="${metadata.openGraph.duration}" />` : ''}
      ${metadata.openGraph.genre ? `<meta property="music:genre" content="${metadata.openGraph.genre}" />` : ''}

      <!-- Twitter Card Meta Tags -->
      <meta name="twitter:card" content="${metadata.twitterCard.card}" />
      <meta name="twitter:site" content="${metadata.twitterCard.site}" />
      <meta name="twitter:title" content="${metadata.twitterCard.title}" />
      <meta name="twitter:description" content="${metadata.twitterCard.description}" />
      <meta name="twitter:image" content="${metadata.twitterCard.image}" />
      ${metadata.twitterCard.player ? `<meta name="twitter:player" content="${metadata.twitterCard.player}" />` : ''}

      <!-- Schema.org JSON-LD -->
      <script type="application/ld+json">
        ${JSON.stringify(metadata.schemaOrg)}
      </script>
    `;

    res.json({ 
      ...metadata,
      metaTags
    });
  } catch (error) {
    console.error('Error fetching song metadata:', error);
    res.status(500).json({ error: 'Failed to fetch song metadata' });
  }
});

export default router;