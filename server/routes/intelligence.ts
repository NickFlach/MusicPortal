/**
 * Music Intelligence API Routes
 * 
 * Exposes the music intelligence engine to the frontend
 * - Analysis results
 * - Discovered patterns
 * - Active hypotheses
 * - Emergence indicators
 * - Consciousness metrics
 */

import { Router } from 'express';
import { musicIntelligence } from '../services/music-intelligence';
import { db } from '@db';
import { sql } from 'drizzle-orm';

const router = Router();

// ==========================================================================
// ANALYSIS ENDPOINTS
// ==========================================================================

/**
 * Get features for a specific song
 */
router.get('/features/:songId', async (req, res) => {
  try {
    const songId = parseInt(req.params.songId);
    const features = musicIntelligence.getFeatures(songId);
    
    if (!features) {
      return res.status(404).json({
        error: 'Song features not found',
        message: 'This song has not been analyzed yet'
      });
    }
    
    res.json(features);
  } catch (error) {
    console.error('Error fetching song features:', error);
    res.status(500).json({
      error: 'Failed to fetch song features',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get features for multiple songs
 */
router.post('/features/batch', async (req, res) => {
  try {
    const { songIds } = req.body;
    
    if (!Array.isArray(songIds)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'songIds must be an array'
      });
    }
    
    const features = musicIntelligence.getBatchFeatures(songIds);
    const result: Record<number, any> = {};
    
    features.forEach((value, key) => {
      result[key] = value;
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching batch features:', error);
    res.status(500).json({
      error: 'Failed to fetch batch features',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==========================================================================
// PATTERN ENDPOINTS
// ==========================================================================

/**
 * Get all discovered patterns
 */
router.get('/patterns', async (req, res) => {
  try {
    const patterns = await db.query.musicalPatterns?.findMany({
      orderBy: (patterns, { desc }) => [desc(patterns.discoveredAt)]
    }) || [];
    
    res.json(patterns);
  } catch (error) {
    console.error('Error fetching patterns:', error);
    res.status(500).json({
      error: 'Failed to fetch patterns',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get patterns with high universality
 */
router.get('/patterns/universal', async (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold as string) || 0.7;
    
    // TODO: Use Drizzle query when schema is updated
    const patterns = await db.execute(sql`
      SELECT * FROM musical_patterns 
      WHERE universality_score >= ${threshold}
      ORDER BY universality_score DESC, discovered_at DESC
    `);
    
    res.json(patterns.rows);
  } catch (error) {
    console.error('Error fetching universal patterns:', error);
    res.status(500).json({
      error: 'Failed to fetch universal patterns',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Trigger pattern detection (manual)
 */
router.post('/patterns/detect', async (req, res) => {
  try {
    const patterns = await musicIntelligence.findPatterns();
    
    res.json({
      success: true,
      patternsFound: patterns.length,
      patterns
    });
  } catch (error) {
    console.error('Error detecting patterns:', error);
    res.status(500).json({
      error: 'Failed to detect patterns',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==========================================================================
// HYPOTHESIS ENDPOINTS
// ==========================================================================

/**
 * Get all hypotheses
 */
router.get('/hypotheses', async (req, res) => {
  try {
    const status = req.query.status as string;
    
    let query = sql`SELECT * FROM musical_hypotheses`;
    
    if (status) {
      query = sql`SELECT * FROM musical_hypotheses WHERE test_status = ${status}`;
    }
    
    query = sql`${query} ORDER BY bayesian_confidence DESC, generated_at DESC`;
    
    const result = await db.execute(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching hypotheses:', error);
    res.status(500).json({
      error: 'Failed to fetch hypotheses',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get active experiments
 */
router.get('/hypotheses/active', async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT * FROM musical_hypotheses 
      WHERE test_status = 'testing'
      ORDER BY bayesian_confidence DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching active hypotheses:', error);
    res.status(500).json({
      error: 'Failed to fetch active hypotheses',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==========================================================================
// EMERGENCE ENDPOINTS
// ==========================================================================

/**
 * Get emergence indicators
 */
router.get('/emergence', async (req, res) => {
  try {
    const type = req.query.type as string;
    
    let query = sql`SELECT * FROM emergence_indicators`;
    
    if (type) {
      query = sql`SELECT * FROM emergence_indicators WHERE type = ${type}`;
    }
    
    query = sql`${query} ORDER BY significance DESC, timestamp DESC LIMIT 100`;
    
    const result = await db.execute(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching emergence indicators:', error);
    res.status(500).json({
      error: 'Failed to fetch emergence indicators',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get significant emergence events
 */
router.get('/emergence/significant', async (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold as string) || 0.8;
    
    const result = await db.execute(sql`
      SELECT * FROM emergence_indicators 
      WHERE significance >= ${threshold}
      ORDER BY significance DESC, timestamp DESC
      LIMIT 20
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching significant emergence:', error);
    res.status(500).json({
      error: 'Failed to fetch significant emergence',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==========================================================================
// CONSCIOUSNESS METRICS
// ==========================================================================

/**
 * Get current intelligence metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = musicIntelligence.getIntelligenceMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching intelligence metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch intelligence metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get Phi (consciousness) value
 */
router.get('/metrics/phi', async (req, res) => {
  try {
    const phi = musicIntelligence.calculatePhi();
    
    res.json({
      phi,
      interpretation: phi > 0.5 ? 'High integration (consciousness-like)' : 'Low integration',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error calculating Phi:', error);
    res.status(500).json({
      error: 'Failed to calculate Phi',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==========================================================================
// DISCOVERY FEED
// ==========================================================================

/**
 * Get recent discoveries (for user-facing feed)
 */
router.get('/discoveries', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Combine patterns and emergence indicators into discovery feed
    const [patterns, emergence] = await Promise.all([
      db.execute(sql`
        SELECT 'pattern' as type, id, description, universality_score as significance, discovered_at as timestamp
        FROM musical_patterns 
        ORDER BY discovered_at DESC 
        LIMIT ${limit}
      `),
      db.execute(sql`
        SELECT 'emergence' as type, id::text, description, significance, timestamp
        FROM emergence_indicators 
        ORDER BY timestamp DESC 
        LIMIT ${limit}
      `)
    ]);
    
    const discoveries = [
      ...patterns.rows,
      ...emergence.rows
    ].sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, limit);
    
    res.json(discoveries);
  } catch (error) {
    console.error('Error fetching discoveries:', error);
    res.status(500).json({
      error: 'Failed to fetch discoveries',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==========================================================================
// SYSTEM STATUS
// ==========================================================================

/**
 * Get overall system status
 */
router.get('/status', async (req, res) => {
  try {
    const metrics = musicIntelligence.getIntelligenceMetrics();
    const phi = musicIntelligence.calculatePhi();
    
    // Get counts from database
    const [patternsCount, hypothesesCount, emergenceCount] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) FROM musical_patterns`),
      db.execute(sql`SELECT COUNT(*) FROM musical_hypotheses`),
      db.execute(sql`SELECT COUNT(*) FROM emergence_indicators`)
    ]);
    
    res.json({
      status: 'operational',
      mode: 'moonshot',
      metrics: {
        ...metrics,
        phi,
        dbPatterns: Number(patternsCount.rows[0]?.count || 0),
        dbHypotheses: Number(hypothesesCount.rows[0]?.count || 0),
        dbEmergence: Number(emergenceCount.rows[0]?.count || 0)
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({
      error: 'Failed to fetch system status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
