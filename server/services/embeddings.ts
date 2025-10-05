import OpenAI from "openai";
import { db } from "@db";
import { songs } from "@db/schema";
import { eq, isNull } from "drizzle-orm";
import type { Song } from "@db/schema";

let openai: OpenAI | null = null;

// Initialize OpenAI client if API key is available
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('Embedding Service: Successfully initialized OpenAI client');
  } else if (process.env.XAI_API_KEY) {
    openai = new OpenAI({ baseURL: "https://api.x.ai/v1", apiKey: process.env.XAI_API_KEY });
    console.log('Embedding Service: Successfully initialized X.AI client');
  } else {
    console.log('Embedding Service: No API key found, running in fallback mode');
  }
} catch (error) {
  console.error('Embedding Service: Failed to initialize AI client:', error);
  openai = null;
}

interface CacheEntry {
  embedding: number[];
  timestamp: number;
}

/**
 * Embedding Service for generating and managing vector embeddings
 * Uses OpenAI's text-embedding-3-small model (1536 dimensions)
 */
class EmbeddingService {
  private readonly MODEL = "text-embedding-3-small";
  private readonly EMBEDDING_DIMENSION = 1536;
  private readonly CACHE_SIZE = 1000;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  
  // In-memory LRU cache for embeddings
  private cache: Map<string, CacheEntry> = new Map();
  
  /**
   * Generate embedding for song metadata
   * Concatenates title, artist, and genre (if available)
   */
  async generateSongEmbedding(song: { title: string; artist?: string | null; genre?: string }): Promise<number[] | null> {
    // Create text from song metadata
    const parts = [song.title];
    if (song.artist) parts.push(song.artist);
    if (song.genre) parts.push(song.genre);
    const text = parts.join(' - ');
    
    // Check cache first
    const cached = this.getFromCache(text);
    if (cached) {
      return cached;
    }
    
    // Generate embedding
    const embedding = await this.generateEmbedding(text);
    
    // Store in cache
    if (embedding) {
      this.addToCache(text, embedding);
    }
    
    return embedding;
  }
  
  /**
   * Generate embedding for search query
   */
  async generateQueryEmbedding(query: string): Promise<number[] | null> {
    // Check cache first
    const cached = this.getFromCache(query);
    if (cached) {
      return cached;
    }
    
    // Generate embedding
    const embedding = await this.generateEmbedding(query);
    
    // Store in cache
    if (embedding) {
      this.addToCache(query, embedding);
    }
    
    return embedding;
  }
  
  /**
   * Generate embeddings for multiple songs at once
   */
  async generateBatchEmbeddings(songs: Array<{ title: string; artist?: string | null; genre?: string }>): Promise<(number[] | null)[]> {
    // Create texts for all songs
    const texts = songs.map(song => {
      const parts = [song.title];
      if (song.artist) parts.push(song.artist);
      if (song.genre) parts.push(song.genre);
      return parts.join(' - ');
    });
    
    // Check which ones are in cache
    const results: (number[] | null)[] = new Array(songs.length).fill(null);
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];
    
    texts.forEach((text, index) => {
      const cached = this.getFromCache(text);
      if (cached) {
        results[index] = cached;
      } else {
        uncachedIndices.push(index);
        uncachedTexts.push(text);
      }
    });
    
    // Generate embeddings for uncached items
    if (uncachedTexts.length > 0) {
      const embeddings = await this.generateBatchEmbeddingsInternal(uncachedTexts);
      
      embeddings.forEach((embedding, i) => {
        const originalIndex = uncachedIndices[i];
        results[originalIndex] = embedding;
        
        // Add to cache
        if (embedding) {
          this.addToCache(uncachedTexts[i], embedding);
        }
      });
    }
    
    return results;
  }
  
  /**
   * Update embeddings for all songs that don't have them
   */
  async updateMissingEmbeddings(): Promise<{ updated: number; failed: number }> {
    // Early return if OpenAI client is not available
    if (!openai) {
      console.log('Embedding Service: Skipping embedding updates - API client not available (no API key configured)');
      return { updated: 0, failed: 0 };
    }
    
    console.log('Embedding Service: Fetching songs without embeddings...');
    
    try {
      // Fetch all songs without embeddings
      const songsWithoutEmbeddings = await db.query.songs.findMany({
        where: isNull(songs.embedding),
      });
      
      if (songsWithoutEmbeddings.length === 0) {
        console.log('Embedding Service: All songs already have embeddings');
        return { updated: 0, failed: 0 };
      }
      
      console.log(`Embedding Service: Found ${songsWithoutEmbeddings.length} songs without embeddings`);
      
      let updated = 0;
      let failed = 0;
      
      // Process in batches of 100 to avoid rate limits
      const batchSize = 100;
      for (let i = 0; i < songsWithoutEmbeddings.length; i += batchSize) {
        const batch = songsWithoutEmbeddings.slice(i, i + batchSize);
        console.log(`Embedding Service: Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(songsWithoutEmbeddings.length / batchSize)}`);
        
        // Generate embeddings for batch
        const embeddings = await this.generateBatchEmbeddings(batch);
        
        // Update database
        for (let j = 0; j < batch.length; j++) {
          const song = batch[j];
          const embedding = embeddings[j];
          
          if (embedding) {
            try {
              await db.update(songs)
                .set({ embedding })
                .where(eq(songs.id, song.id));
              updated++;
            } catch (error) {
              console.error(`Embedding Service: Failed to update song ${song.id}:`, error);
              failed++;
            }
          } else {
            failed++;
          }
        }
        
        console.log(`Embedding Service: Progress - Updated: ${updated}, Failed: ${failed}`);
      }
      
      console.log(`Embedding Service: Completed - Updated: ${updated}, Failed: ${failed}`);
      return { updated, failed };
    } catch (error) {
      console.error('Embedding Service: Error updating embeddings:', error);
      throw error;
    }
  }
  
  /**
   * Core embedding generation using OpenAI API
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    // Fallback mode: return null when API is not available
    if (!openai) {
      console.log('Embedding Service: API not available, returning null');
      return null;
    }
    
    try {
      const response = await openai.embeddings.create({
        model: this.MODEL,
        input: text,
        encoding_format: "float",
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding Service: Error generating embedding:', error);
      return null;
    }
  }
  
  /**
   * Generate embeddings for multiple texts at once
   */
  private async generateBatchEmbeddingsInternal(texts: string[]): Promise<(number[] | null)[]> {
    // Fallback mode: return null for all
    if (!openai) {
      console.log('Embedding Service: API not available, returning nulls');
      return texts.map(() => null);
    }
    
    try {
      const response = await openai.embeddings.create({
        model: this.MODEL,
        input: texts,
        encoding_format: "float",
      });
      
      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('Embedding Service: Error generating batch embeddings:', error);
      return texts.map(() => null);
    }
  }
  
  /**
   * Get embedding from cache
   */
  private getFromCache(text: string): number[] | null {
    const entry = this.cache.get(text);
    
    if (!entry) {
      return null;
    }
    
    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(text);
      return null;
    }
    
    // Refresh entry position for true LRU behavior (delete then re-set)
    this.cache.delete(text);
    this.cache.set(text, {
      embedding: entry.embedding,
      timestamp: Date.now(),
    });
    
    return entry.embedding;
  }
  
  /**
   * Add embedding to cache with LRU eviction
   */
  private addToCache(text: string, embedding: number[]): void {
    // If cache is full, remove oldest entry (LRU)
    if (this.cache.size >= this.CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(text, {
      embedding,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Embedding Service: Cache cleared');
  }
  
  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.CACHE_SIZE,
    };
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
