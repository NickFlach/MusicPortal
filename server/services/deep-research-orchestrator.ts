/**
 * Deep Research Orchestrator for Intelligent Music Discovery
 * 
 * Main coordinator that:
 * 1. Analyzes user queries and plans search strategy
 * 2. Coordinates multiple specialized search subagents
 * 3. Aggregates results with confidence scores
 * 4. Provides reasoning and explanations
 * 5. Can ask clarifying questions for vague queries
 * 
 * Architecture inspired by deep research systems with tool-calling pattern
 */

import OpenAI from "openai";
import type { Song } from "@db/schema";
import {
  semanticSearchAgent,
  keywordSearchAgent,
  userBehaviorAgent,
  musicIntelligenceAgent,
  radioDiscoveryAgent,
  ALL_SEARCH_AGENTS,
  type SearchResult,
  type SubagentResponse
} from "./search-subagents";

// ============================================================================
// TYPES
// ============================================================================

export interface ResearchQuery {
  query: string;
  walletAddress?: string;
  context?: {
    recentlyPlayed?: number[];
    lovedSongs?: number[];
    preferredGenres?: string[];
    mood?: string;
  };
}

export interface ResearchPlan {
  strategy: string;
  agentsToUse: string[];
  reasoning: string;
  needsClarification: boolean;
  clarificationQuestions?: string[];
}

export interface AggregatedResult {
  songs: Song[];
  sources: {
    source: string;
    count: number;
    confidence: number;
    reasoning: string;
  }[];
  overallConfidence: number;
  reasoning: string;
  executionTime: number;
}

export interface ResearchResult {
  success: boolean;
  result?: AggregatedResult;
  plan?: ResearchPlan;
  error?: string;
  needsClarification?: boolean;
  clarificationQuestions?: string[];
}

// ============================================================================
// DEEP RESEARCH ORCHESTRATOR
// ============================================================================

class DeepResearchOrchestrator {
  private openai: OpenAI | null = null;
  private model: string = "grok-2-1212";
  
  constructor() {
    // Initialize AI client (X.AI preferred, OpenAI as fallback)
    try {
      if (process.env.XAI_API_KEY) {
        this.openai = new OpenAI({ 
          baseURL: "https://api.x.ai/v1", 
          apiKey: process.env.XAI_API_KEY 
        });
        this.model = "grok-2-1212";
        console.log('🧠 Deep Research Orchestrator: Initialized with X.AI (Grok-2)');
      } else if (process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.model = "gpt-4-turbo-preview";
        console.log('🧠 Deep Research Orchestrator: Initialized with OpenAI (GPT-4)');
      } else {
        console.log('🧠 Deep Research Orchestrator: Running in fallback mode (no API key)');
      }
    } catch (error) {
      console.error('Deep Research Orchestrator: Failed to initialize AI client:', error);
      this.openai = null;
    }
  }
  
  // ==========================================================================
  // MAIN RESEARCH FLOW
  // ==========================================================================
  
  /**
   * Execute deep research for a music discovery query
   */
  async research(request: ResearchQuery): Promise<ResearchResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Deep Research: Starting research for query: "${request.query}"`);
      
      // Step 1: Plan the search strategy
      const plan = await this.planStrategy(request);
      
      // Step 2: Check if we need clarification
      if (plan.needsClarification) {
        console.log('❓ Deep Research: Query needs clarification');
        return {
          success: true,
          plan,
          needsClarification: true,
          clarificationQuestions: plan.clarificationQuestions
        };
      }
      
      console.log(`📋 Deep Research: Strategy - ${plan.strategy}`);
      console.log(`🤖 Deep Research: Using agents - ${plan.agentsToUse.join(', ')}`);
      
      // Step 3: Execute searches in parallel
      const searchResults = await this.executeSearches(request, plan);
      
      // Step 4: Aggregate and rank results
      const aggregated = await this.aggregateResults(searchResults, request);
      
      const executionTime = Date.now() - startTime;
      aggregated.executionTime = executionTime;
      
      console.log(`✅ Deep Research: Completed in ${executionTime}ms`);
      console.log(`📊 Deep Research: Found ${aggregated.songs.length} total songs from ${aggregated.sources.length} sources`);
      console.log(`🎯 Deep Research: Overall confidence: ${(aggregated.overallConfidence * 100).toFixed(1)}%`);
      
      return {
        success: true,
        result: aggregated,
        plan
      };
    } catch (error) {
      console.error('❌ Deep Research: Error during research:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // ==========================================================================
  // STRATEGY PLANNING
  // ==========================================================================
  
  /**
   * Use AI to plan the optimal search strategy
   */
  private async planStrategy(request: ResearchQuery): Promise<ResearchPlan> {
    // If no AI available, use deterministic fallback
    if (!this.openai) {
      return this.fallbackStrategy(request);
    }
    
    try {
      const systemPrompt = `You are an expert music discovery strategist. Analyze the user's query and determine:
1. Whether the query is clear enough to proceed or needs clarification
2. Which search agents should be used (semantic, keyword, userBehavior, musicIntelligence, radioDiscovery)
3. The optimal search strategy

Available agents:
- semantic: Best for conceptual/mood-based searches using embeddings
- keyword: Best for exact title/artist matches
- userBehavior: Best for personalized recommendations based on history
- musicIntelligence: Best for discovering music by sonic patterns
- radioDiscovery: Best for finding external radio stations

Respond in JSON format with: { strategy, agentsToUse, reasoning, needsClarification, clarificationQuestions }`;
      
      const userPrompt = `Query: "${request.query}"
Context: ${JSON.stringify(request.context || {})}
Wallet: ${request.walletAddress ? 'Available' : 'Not available'}

Plan the search strategy.`;
      
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });
      
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No strategy response from AI');
      }
      
      const plan = JSON.parse(content) as ResearchPlan;
      
      // Validate agent names
      plan.agentsToUse = plan.agentsToUse.filter(agent => 
        agent in ALL_SEARCH_AGENTS
      );
      
      // Ensure at least one agent is used
      if (plan.agentsToUse.length === 0 && !plan.needsClarification) {
        plan.agentsToUse = ['keyword', 'semantic'];
      }
      
      return plan;
    } catch (error) {
      console.error('Error planning strategy with AI, using fallback:', error);
      return this.fallbackStrategy(request);
    }
  }
  
  /**
   * Fallback strategy when AI is not available
   */
  private fallbackStrategy(request: ResearchQuery): ResearchPlan {
    const query = request.query.toLowerCase().trim();
    
    // Check if query is too vague
    if (query.length < 3) {
      return {
        strategy: 'Query too short',
        agentsToUse: [],
        reasoning: 'Query needs to be at least 3 characters',
        needsClarification: true,
        clarificationQuestions: [
          'What type of music are you looking for?',
          'Can you provide more details about the artist, genre, or mood?'
        ]
      };
    }
    
    // Determine agents based on query patterns
    const agentsToUse: string[] = [];
    
    // Always use keyword search
    agentsToUse.push('keyword');
    
    // Use semantic if query seems conceptual (mood, vibe, feeling)
    if (/(mood|vibe|feel|energy|chill|upbeat|sad|happy|relax)/i.test(query)) {
      agentsToUse.push('semantic');
      agentsToUse.push('musicIntelligence');
    } else {
      // Otherwise still use semantic for better coverage
      agentsToUse.push('semantic');
    }
    
    // Use user behavior if we have wallet
    if (request.walletAddress) {
      agentsToUse.push('userBehavior');
    }
    
    // Use radio discovery if query mentions radio/station/live
    if (/(radio|station|live|stream)/i.test(query)) {
      agentsToUse.push('radioDiscovery');
    }
    
    return {
      strategy: 'Multi-source search with keyword and semantic matching',
      agentsToUse,
      reasoning: 'Using deterministic strategy: keyword search for exact matches, semantic search for similar concepts, and personalized recommendations if user is logged in.',
      needsClarification: false
    };
  }
  
  // ==========================================================================
  // SEARCH EXECUTION
  // ==========================================================================
  
  /**
   * Execute searches across selected agents in parallel
   */
  private async executeSearches(
    request: ResearchQuery,
    plan: ResearchPlan
  ): Promise<SubagentResponse[]> {
    const context = {
      limit: 20,
      walletAddress: request.walletAddress,
      ...request.context
    };
    
    // Execute all agent searches in parallel
    const promises = plan.agentsToUse.map(agentName => {
      const agent = ALL_SEARCH_AGENTS[agentName as keyof typeof ALL_SEARCH_AGENTS];
      if (!agent) {
        console.warn(`Unknown agent: ${agentName}`);
        return Promise.resolve({
          success: false,
          error: `Unknown agent: ${agentName}`,
          executionTime: 0
        } as SubagentResponse);
      }
      
      return agent.execute(request.query, context);
    });
    
    const results = await Promise.all(promises);
    
    return results;
  }
  
  // ==========================================================================
  // RESULT AGGREGATION
  // ==========================================================================
  
  /**
   * Aggregate and rank results from multiple sources
   */
  private async aggregateResults(
    searchResults: SubagentResponse[],
    request: ResearchQuery
  ): Promise<AggregatedResult> {
    // Filter successful results
    const successfulResults = searchResults.filter(r => r.success && r.result);
    
    if (successfulResults.length === 0) {
      return {
        songs: [],
        sources: [],
        overallConfidence: 0,
        reasoning: 'No results found from any search agent',
        executionTime: 0
      };
    }
    
    // Collect all unique songs with scores
    const songScores = new Map<number, {
      song: Song;
      totalScore: number;
      sources: string[];
      confidences: number[];
    }>();
    
    // Process each source
    const sources: AggregatedResult['sources'] = [];
    
    for (const result of successfulResults) {
      if (!result.result) continue;
      
      const { songs, confidence, reasoning, source } = result.result;
      
      // Add to sources summary
      sources.push({
        source,
        count: songs.length,
        confidence,
        reasoning
      });
      
      // Weight results by confidence
      songs.forEach((song, index) => {
        // Position-based scoring (earlier results score higher)
        const positionScore = 1 - (index / songs.length) * 0.5;
        const weightedScore = confidence * positionScore;
        
        const existing = songScores.get(song.id);
        
        if (existing) {
          // Song found in multiple sources - boost score
          existing.totalScore += weightedScore * 1.5; // Bonus for multi-source
          existing.sources.push(source);
          existing.confidences.push(confidence);
        } else {
          songScores.set(song.id, {
            song,
            totalScore: weightedScore,
            sources: [source],
            confidences: [confidence]
          });
        }
      });
    }
    
    // Sort by total score
    const rankedSongs = Array.from(songScores.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 50); // Top 50 results
    
    // Calculate overall confidence
    const avgConfidence = sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length;
    const multiSourceBonus = rankedSongs.length > 0 
      ? rankedSongs.filter(s => s.sources.length > 1).length / rankedSongs.length
      : 0;
    const overallConfidence = Math.min(avgConfidence * (1 + multiSourceBonus * 0.2), 1.0);
    
    // Generate reasoning
    const reasoning = this.generateReasoning(sources, rankedSongs, overallConfidence);
    
    return {
      songs: rankedSongs.map(s => s.song),
      sources,
      overallConfidence,
      reasoning,
      executionTime: 0 // Set by caller
    };
  }
  
  /**
   * Generate human-readable reasoning for the results
   */
  private generateReasoning(
    sources: AggregatedResult['sources'],
    rankedSongs: any[],
    overallConfidence: number
  ): string {
    const parts: string[] = [];
    
    // Summary
    parts.push(`Found ${rankedSongs.length} songs from ${sources.length} different sources.`);
    
    // Source breakdown
    const sourceDescriptions = sources.map(s => 
      `${s.source} (${s.count} songs, ${(s.confidence * 100).toFixed(0)}% confidence)`
    );
    parts.push(`Sources used: ${sourceDescriptions.join(', ')}.`);
    
    // Multi-source songs
    const multiSourceCount = rankedSongs.filter(s => s.sources.length > 1).length;
    if (multiSourceCount > 0) {
      parts.push(`${multiSourceCount} songs were found by multiple sources, indicating high relevance.`);
    }
    
    // Confidence explanation
    if (overallConfidence > 0.8) {
      parts.push('High confidence in these results - strong matches across multiple search methods.');
    } else if (overallConfidence > 0.6) {
      parts.push('Moderate confidence - good matches found, but may benefit from refining the query.');
    } else {
      parts.push('Lower confidence - results may be exploratory. Consider adding more specific criteria.');
    }
    
    return parts.join(' ');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const deepResearchOrchestrator = new DeepResearchOrchestrator();
