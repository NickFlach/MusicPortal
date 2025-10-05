import { Router } from 'express';
import { z } from 'zod';
import { deepResearchOrchestrator } from '../services/deep-research-orchestrator';
import { ALL_SEARCH_AGENTS } from '../services/search-subagents';
import type { Song } from '@db/schema';

const router = Router();

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

const DeepSearchSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(500, 'Query too long'),
  userAddress: z.string().optional(),
  maxResults: z.number().int().min(1).max(100).optional().default(20),
  context: z.object({
    recentlyPlayed: z.array(z.number()).optional(),
    lovedSongs: z.array(z.number()).optional(),
    preferredGenres: z.array(z.string()).optional(),
    mood: z.string().optional()
  }).optional()
});

const ClarifySchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(500, 'Query too long'),
  clarification: z.string().min(1, 'Clarification cannot be empty').max(500, 'Clarification too long'),
  userAddress: z.string().optional(),
  maxResults: z.number().int().min(1).max(100).optional().default(20)
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if AI services are available
 */
function checkAIAvailability(): {
  available: boolean;
  provider: string | null;
  model: string | null;
} {
  if (process.env.XAI_API_KEY) {
    return {
      available: true,
      provider: 'X.AI',
      model: 'grok-2-1212'
    };
  }
  
  if (process.env.OPENAI_API_KEY) {
    return {
      available: true,
      provider: 'OpenAI',
      model: 'gpt-4-turbo-preview'
    };
  }
  
  return {
    available: false,
    provider: null,
    model: null
  };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/research/deep-search
 * Perform deep research on a music discovery query
 */
router.post('/deep-search', async (req, res) => {
  try {
    console.log('🔍 Deep Search Request:', {
      query: req.body.query,
      userAddress: req.body.userAddress ? '***' : 'none',
      maxResults: req.body.maxResults
    });
    
    // Validate request body
    const validationResult = DeepSearchSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validationResult.error.errors
      });
    }
    
    const { query, userAddress, maxResults, context } = validationResult.data;
    
    // Execute deep research
    const result = await deepResearchOrchestrator.research({
      query,
      walletAddress: userAddress,
      context
    });
    
    // Handle clarification needed
    if (result.needsClarification) {
      console.log('❓ Deep Search: Needs clarification');
      return res.json({
        success: true,
        needsClarification: true,
        clarifyingQuestions: result.clarificationQuestions,
        plan: result.plan
      });
    }
    
    // Handle error
    if (!result.success || !result.result) {
      console.error('❌ Deep Search: Failed', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Research failed',
        fallbackMessage: 'Unable to complete deep research. Try a more specific query or use regular search.'
      });
    }
    
    // Success - return results
    const { result: aggregated, plan } = result;
    
    // Limit results to maxResults
    const limitedSongs = aggregated.songs.slice(0, maxResults);
    
    console.log(`✅ Deep Search: Returning ${limitedSongs.length} results`);
    
    res.json({
      success: true,
      results: limitedSongs,
      reasoning: aggregated.reasoning,
      confidence: aggregated.overallConfidence,
      sources: aggregated.sources,
      executionTime: aggregated.executionTime,
      plan: {
        strategy: plan?.strategy,
        agentsUsed: plan?.agentsToUse
      }
    });
    
  } catch (error) {
    console.error('❌ Deep Search Error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during deep search',
      details: error instanceof Error ? error.message : 'Unknown error',
      fallbackMessage: 'An unexpected error occurred. Please try again or use regular search.'
    });
  }
});

/**
 * POST /api/research/clarify
 * Process a clarified query after user answers clarifying questions
 */
router.post('/clarify', async (req, res) => {
  try {
    console.log('💬 Clarify Request:', {
      query: req.body.query,
      clarification: req.body.clarification,
      userAddress: req.body.userAddress ? '***' : 'none'
    });
    
    // Validate request body
    const validationResult = ClarifySchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validationResult.error.errors
      });
    }
    
    const { query, clarification, userAddress, maxResults } = validationResult.data;
    
    // Combine original query with clarification
    const refinedQuery = `${query} - ${clarification}`;
    
    console.log(`🔍 Refined Query: "${refinedQuery}"`);
    
    // Execute deep research with refined query
    const result = await deepResearchOrchestrator.research({
      query: refinedQuery,
      walletAddress: userAddress
    });
    
    // Handle error
    if (!result.success || !result.result) {
      console.error('❌ Clarify: Failed', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Research failed',
        fallbackMessage: 'Unable to complete search with clarification. Try a different query.'
      });
    }
    
    // Success - return results
    const { result: aggregated, plan } = result;
    
    // Limit results to maxResults
    const limitedSongs = aggregated.songs.slice(0, maxResults);
    
    console.log(`✅ Clarify: Returning ${limitedSongs.length} results`);
    
    res.json({
      success: true,
      results: limitedSongs,
      reasoning: aggregated.reasoning,
      confidence: aggregated.overallConfidence,
      sources: aggregated.sources,
      executionTime: aggregated.executionTime,
      refinedQuery,
      plan: {
        strategy: plan?.strategy,
        agentsUsed: plan?.agentsToUse
      }
    });
    
  } catch (error) {
    console.error('❌ Clarify Error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during clarified search',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/research/status
 * Get system status for debugging
 */
router.get('/status', async (req, res) => {
  try {
    console.log('📊 Status Request');
    
    // Check AI availability
    const aiStatus = checkAIAvailability();
    
    // Check agent status
    const agentStatus = Object.entries(ALL_SEARCH_AGENTS).map(([name, agent]) => ({
      name,
      available: true,
      description: getAgentDescription(name)
    }));
    
    // Database status (basic check)
    let databaseStatus = {
      connected: false,
      error: null as string | null
    };
    
    try {
      // Simple check - if we can import db, assume connection is OK
      const { db } = await import('@db');
      databaseStatus.connected = true;
    } catch (error) {
      databaseStatus.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    // Overall system status
    const systemStatus = {
      operational: aiStatus.available && databaseStatus.connected,
      mode: aiStatus.available ? 'AI-Enhanced' : 'Fallback',
      degraded: !aiStatus.available || !databaseStatus.connected
    };
    
    const status = {
      system: systemStatus,
      ai: {
        available: aiStatus.available,
        provider: aiStatus.provider,
        model: aiStatus.model,
        mode: aiStatus.available ? 'AI-powered strategy planning' : 'Deterministic fallback'
      },
      database: databaseStatus,
      agents: agentStatus,
      capabilities: {
        semanticSearch: !!process.env.OPENAI_API_KEY || !!process.env.XAI_API_KEY,
        keywordSearch: true,
        userBehavior: true,
        musicIntelligence: true,
        radioDiscovery: true
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Status:', {
      operational: status.system.operational,
      mode: status.system.mode,
      aiProvider: status.ai.provider
    });
    
    res.json(status);
    
  } catch (error) {
    console.error('❌ Status Error:', error);
    
    res.status(500).json({
      error: 'Failed to retrieve system status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get human-readable description of each agent
 */
function getAgentDescription(agentName: string): string {
  const descriptions: Record<string, string> = {
    semantic: 'Vector-based semantic search using AI embeddings for conceptual matching',
    keyword: 'Full-text keyword search for exact title/artist matches',
    userBehavior: 'Personalized recommendations based on listening history',
    musicIntelligence: 'Pattern-based discovery using sonic characteristics',
    radioDiscovery: 'External radio station discovery and streaming'
  };
  
  return descriptions[agentName] || 'Unknown agent';
}

export default router;
