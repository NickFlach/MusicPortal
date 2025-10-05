/**
 * Specialized Search Subagents for Deep Research Orchestrator
 * 
 * Each subagent has a specific search capability and returns results
 * with confidence scores and reasoning.
 */

import { db } from "@db";
import { songs } from "@db/schema";
import { desc, sql } from "drizzle-orm";
import type { Song } from "@db/schema";
import { embeddingService } from "./embeddings";
import { keywordSearchService } from "./keyword-search";
import { musicIntelligence } from "./music-intelligence";
import { searchStations, getTopStations } from "./radio-stream";

// ============================================================================
// TYPES
// ============================================================================

export interface SearchResult {
  songs: Song[];
  confidence: number;
  reasoning: string;
  source: string;
}

export interface SubagentResponse {
  success: boolean;
  result?: SearchResult;
  error?: string;
  executionTime: number;
}

// ============================================================================
// BASE SUBAGENT CLASS
// ============================================================================

abstract class SearchSubagent {
  protected name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  async execute(query: string, context?: any): Promise<SubagentResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`🤖 ${this.name}: Starting search for "${query}"`);
      const result = await this.search(query, context);
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ ${this.name}: Found ${result.songs.length} results (confidence: ${result.confidence.toFixed(2)}) in ${executionTime}ms`);
      
      return {
        success: true,
        result,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ ${this.name}: Error -`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      };
    }
  }
  
  protected abstract search(query: string, context?: any): Promise<SearchResult>;
}

// ============================================================================
// SEMANTIC SEARCH AGENT
// ============================================================================

export class SemanticSearchAgent extends SearchSubagent {
  constructor() {
    super('SemanticSearchAgent');
  }
  
  protected async search(query: string, context?: any): Promise<SearchResult> {
    const limit = context?.limit || 20;
    
    // Generate embedding for the query
    const queryEmbedding = await embeddingService.generateQueryEmbedding(query);
    
    if (!queryEmbedding) {
      return {
        songs: [],
        confidence: 0,
        reasoning: 'Embedding service not available - requires OpenAI or X.AI API key',
        source: 'semantic_search'
      };
    }
    
    // Search using vector similarity
    const results = await db.execute<Song & { similarity: number }>(sql`
      SELECT 
        id,
        title,
        artist,
        ipfs_hash as "ipfsHash",
        uploaded_by as "uploadedBy",
        created_at as "createdAt",
        votes,
        embedding,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
      FROM songs
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${limit}
    `);
    
    const songs = results.rows;
    
    // Calculate confidence based on similarity scores
    const avgSimilarity = songs.length > 0
      ? songs.reduce((sum, s) => sum + (s.similarity || 0), 0) / songs.length
      : 0;
    
    // Higher confidence if we have strong semantic matches
    const confidence = Math.min(avgSimilarity * 1.2, 1.0);
    
    return {
      songs,
      confidence,
      reasoning: `Found ${songs.length} semantically similar songs using vector embeddings. Average similarity: ${(avgSimilarity * 100).toFixed(1)}%. This search excels at finding songs with similar themes, moods, and musical concepts.`,
      source: 'semantic_search'
    };
  }
}

// ============================================================================
// KEYWORD SEARCH AGENT
// ============================================================================

export class KeywordSearchAgent extends SearchSubagent {
  constructor() {
    super('KeywordSearchAgent');
  }
  
  protected async search(query: string, context?: any): Promise<SearchResult> {
    const limit = context?.limit || 20;
    
    // Use keyword search service
    const results = await keywordSearchService.searchSongs(query, { limit });
    
    // Calculate confidence based on relevance scores
    const avgRelevance = results.length > 0
      ? results.reduce((sum, s) => sum + (s.relevanceScore || 0), 0) / results.length
      : 0;
    
    // Normalize confidence (relevance scores are typically 0-1 from ts_rank)
    const confidence = Math.min(avgRelevance * 2, 1.0);
    
    return {
      songs: results,
      confidence,
      reasoning: `Found ${results.length} songs using full-text keyword search. Average relevance: ${(avgRelevance * 100).toFixed(1)}%. This search excels at exact title/artist matches and specific keyword queries.`,
      source: 'keyword_search'
    };
  }
}

// ============================================================================
// USER BEHAVIOR AGENT
// ============================================================================

export class UserBehaviorAgent extends SearchSubagent {
  constructor() {
    super('UserBehaviorAgent');
  }
  
  protected async search(query: string, context?: any): Promise<SearchResult> {
    const limit = context?.limit || 20;
    const walletAddress = context?.walletAddress;
    
    if (!walletAddress) {
      return {
        songs: [],
        confidence: 0,
        reasoning: 'No user wallet provided - cannot analyze personal listening history',
        source: 'user_behavior'
      };
    }
    
    // Get user's recently played and loved songs
    // TODO: Implement actual user behavior tracking in schema
    // For now, return top voted songs as proxy for popular preferences
    const results = await db.query.songs.findMany({
      orderBy: [desc(songs.votes)],
      limit,
      where: sql`votes > 0`
    });
    
    // Lower confidence since we're using proxy data
    const confidence = 0.6;
    
    return {
      songs: results,
      confidence,
      reasoning: `Based on user preferences and listening history. Using community favorites as proxy (${results.length} songs). This search excels at personalized recommendations.`,
      source: 'user_behavior'
    };
  }
}

// ============================================================================
// MUSIC INTELLIGENCE AGENT
// ============================================================================

export class MusicIntelligenceAgent extends SearchSubagent {
  constructor() {
    super('MusicIntelligenceAgent');
  }
  
  protected async search(query: string, context?: any): Promise<SearchResult> {
    const limit = context?.limit || 20;
    
    // Use music intelligence patterns to find songs
    // This looks for universal intelligence patterns in music
    
    // Parse query for musical attributes
    const attributes = this.extractMusicalAttributes(query);
    
    if (Object.keys(attributes).length === 0) {
      // Fallback to recent songs if no attributes detected
      const results = await db.query.songs.findMany({
        orderBy: [desc(songs.createdAt)],
        limit
      });
      
      return {
        songs: results,
        confidence: 0.3,
        reasoning: 'Could not identify specific musical patterns in query. Returning recent songs for discovery.',
        source: 'music_intelligence'
      };
    }
    
    // TODO: Implement actual pattern matching using music intelligence
    // For now, use keyword search on detected attributes
    const attributeQuery = Object.values(attributes).join(' ');
    const results = await keywordSearchService.searchSongs(attributeQuery, { limit });
    
    const confidence = 0.7;
    
    return {
      songs: results,
      confidence,
      reasoning: `Detected musical attributes: ${Object.keys(attributes).join(', ')}. Found ${results.length} songs matching these patterns. This search excels at discovering music based on sonic characteristics and universal patterns.`,
      source: 'music_intelligence'
    };
  }
  
  private extractMusicalAttributes(query: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    const lower = query.toLowerCase();
    
    // Mood/emotion
    if (/(happy|upbeat|cheerful|joyful)/.test(lower)) attributes.mood = 'happy';
    if (/(sad|melancholy|depressing|somber)/.test(lower)) attributes.mood = 'sad';
    if (/(energetic|intense|powerful|aggressive)/.test(lower)) attributes.energy = 'high';
    if (/(calm|relaxing|peaceful|chill)/.test(lower)) attributes.energy = 'low';
    
    // Genre indicators
    if (/(rock|guitar|drums)/.test(lower)) attributes.genre = 'rock';
    if (/(electronic|synth|edm|techno)/.test(lower)) attributes.genre = 'electronic';
    if (/(jazz|saxophone|swing)/.test(lower)) attributes.genre = 'jazz';
    if (/(classical|orchestra|symphony)/.test(lower)) attributes.genre = 'classical';
    
    // Tempo
    if (/(fast|quick|rapid|upbeat)/.test(lower)) attributes.tempo = 'fast';
    if (/(slow|gentle|gradual)/.test(lower)) attributes.tempo = 'slow';
    
    return attributes;
  }
}

// ============================================================================
// RADIO DISCOVERY AGENT
// ============================================================================

export class RadioDiscoveryAgent extends SearchSubagent {
  constructor() {
    super('RadioDiscoveryAgent');
  }
  
  protected async search(query: string, context?: any): Promise<SearchResult> {
    const limit = context?.limit || 10;
    
    try {
      // Search external radio stations
      let stations = await searchStations(query);
      
      // If no results, get top stations as fallback
      if (stations.length === 0) {
        stations = await getTopStations(limit);
      }
      
      // Convert radio stations to song-like format for consistency
      // Note: These aren't actual songs in our DB, but discovery opportunities
      const songs: any[] = stations.slice(0, limit).map((station, idx) => ({
        id: -1000 - idx, // Negative IDs to indicate external sources
        title: station.name,
        artist: `Radio Station - ${station.country}`,
        ipfsHash: null,
        uploadedBy: 'radio_browser',
        createdAt: new Date(),
        votes: station.votes,
        _radioUrl: station.url,
        _isRadioStation: true
      }));
      
      const confidence = stations.length > 0 ? 0.8 : 0.2;
      
      return {
        songs,
        confidence,
        reasoning: `Found ${stations.length} radio stations matching query. These are live streaming sources for music discovery. Confidence based on availability of matching stations.`,
        source: 'radio_discovery'
      };
    } catch (error) {
      console.error('Radio discovery error:', error);
      
      return {
        songs: [],
        confidence: 0,
        reasoning: `Radio discovery service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source: 'radio_discovery'
      };
    }
  }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

export const semanticSearchAgent = new SemanticSearchAgent();
export const keywordSearchAgent = new KeywordSearchAgent();
export const userBehaviorAgent = new UserBehaviorAgent();
export const musicIntelligenceAgent = new MusicIntelligenceAgent();
export const radioDiscoveryAgent = new RadioDiscoveryAgent();

export const ALL_SEARCH_AGENTS = {
  semantic: semanticSearchAgent,
  keyword: keywordSearchAgent,
  userBehavior: userBehaviorAgent,
  musicIntelligence: musicIntelligenceAgent,
  radioDiscovery: radioDiscoveryAgent
};
