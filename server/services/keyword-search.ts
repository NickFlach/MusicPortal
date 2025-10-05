import { db } from "@db";
import { songs } from "@db/schema";
import { sql } from "drizzle-orm";
import type { Song } from "@db/schema";

interface SearchOptions {
  limit?: number;
  offset?: number;
}

interface SearchResult extends Song {
  relevanceScore: number;
  combinedScore: number;
  [key: string]: unknown;
}

class KeywordSearchService {
  private readonly DEFAULT_LIMIT = 50;
  private readonly DEFAULT_OFFSET = 0;
  
  async searchSongs(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const { limit = this.DEFAULT_LIMIT, offset = this.DEFAULT_OFFSET } = options;
    
    if (!query || query.trim().length === 0) {
      return [];
    }
    
    const sanitizedQuery = this.sanitizeQuery(query);
    
    if (!sanitizedQuery || sanitizedQuery.trim().length === 0) {
      console.log('Keyword Search: Query sanitization resulted in empty query (all stop words or punctuation removed)');
      return [];
    }
    
    console.log(`Keyword Search: Searching for "${sanitizedQuery}" with limit ${limit}, offset ${offset}`);
    
    try {
      const results = await db.execute<SearchResult>(sql`
        SELECT 
          id,
          title,
          artist,
          ipfs_hash as "ipfsHash",
          uploaded_by as "uploadedBy",
          created_at as "createdAt",
          votes,
          embedding,
          ts_rank(
            to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(artist, '')),
            to_tsquery('english', ${sanitizedQuery})
          ) as "relevanceScore",
          (
            ts_rank(
              to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(artist, '')),
              to_tsquery('english', ${sanitizedQuery})
            ) * 10 +
            COALESCE(votes, 0) * 0.1
          ) as "combinedScore"
        FROM songs
        WHERE 
          to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(artist, ''))
          @@ to_tsquery('english', ${sanitizedQuery})
        ORDER BY "combinedScore" DESC, "relevanceScore" DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `);
      
      console.log(`Keyword Search: Found ${results.rows.length} results`);
      
      return results.rows;
    } catch (error) {
      console.error('Keyword Search: Error executing search:', error);
      return [];
    }
  }
  
  async searchSongsByField(
    query: string,
    field: 'title' | 'artist',
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const { limit = this.DEFAULT_LIMIT, offset = this.DEFAULT_OFFSET } = options;
    
    if (!query || query.trim().length === 0) {
      return [];
    }
    
    const sanitizedQuery = this.sanitizeQuery(query);
    
    if (!sanitizedQuery || sanitizedQuery.trim().length === 0) {
      console.log(`Keyword Search: Query sanitization resulted in empty query for ${field} search (all stop words or punctuation removed)`);
      return [];
    }
    
    console.log(`Keyword Search: Searching in ${field} for "${sanitizedQuery}"`);
    
    try {
      const fieldColumn = field === 'title' ? 'title' : 'artist';
      
      const results = await db.execute<SearchResult>(sql`
        SELECT 
          id,
          title,
          artist,
          ipfs_hash as "ipfsHash",
          uploaded_by as "uploadedBy",
          created_at as "createdAt",
          votes,
          embedding,
          ts_rank(
            to_tsvector('english', COALESCE(${sql.raw(fieldColumn)}, '')),
            to_tsquery('english', ${sanitizedQuery})
          ) as "relevanceScore",
          (
            ts_rank(
              to_tsvector('english', COALESCE(${sql.raw(fieldColumn)}, '')),
              to_tsquery('english', ${sanitizedQuery})
            ) * 10 +
            COALESCE(votes, 0) * 0.1
          ) as "combinedScore"
        FROM songs
        WHERE 
          to_tsvector('english', COALESCE(${sql.raw(fieldColumn)}, ''))
          @@ to_tsquery('english', ${sanitizedQuery})
        ORDER BY "combinedScore" DESC, "relevanceScore" DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `);
      
      console.log(`Keyword Search: Found ${results.rows.length} results in ${field}`);
      
      return results.rows;
    } catch (error) {
      console.error(`Keyword Search: Error executing search in ${field}:`, error);
      return [];
    }
  }
  
  async searchWithPrefix(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const { limit = this.DEFAULT_LIMIT, offset = this.DEFAULT_OFFSET } = options;
    
    if (!query || query.trim().length === 0) {
      return [];
    }
    
    const sanitizedQuery = this.sanitizeQueryWithPrefix(query);
    
    if (!sanitizedQuery || sanitizedQuery.trim().length === 0) {
      console.log('Keyword Search: Query sanitization resulted in empty query for prefix search (all stop words or punctuation removed)');
      return [];
    }
    
    console.log(`Keyword Search: Prefix search for "${sanitizedQuery}"`);
    
    try {
      const results = await db.execute<SearchResult>(sql`
        SELECT 
          id,
          title,
          artist,
          ipfs_hash as "ipfsHash",
          uploaded_by as "uploadedBy",
          created_at as "createdAt",
          votes,
          embedding,
          ts_rank(
            to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(artist, '')),
            to_tsquery('english', ${sanitizedQuery})
          ) as "relevanceScore",
          (
            ts_rank(
              to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(artist, '')),
              to_tsquery('english', ${sanitizedQuery})
            ) * 10 +
            COALESCE(votes, 0) * 0.1
          ) as "combinedScore"
        FROM songs
        WHERE 
          to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(artist, ''))
          @@ to_tsquery('english', ${sanitizedQuery})
        ORDER BY "combinedScore" DESC, "relevanceScore" DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `);
      
      console.log(`Keyword Search: Found ${results.rows.length} results with prefix matching`);
      
      return results.rows;
    } catch (error) {
      console.error('Keyword Search: Error executing prefix search:', error);
      return [];
    }
  }
  
  async createSearchIndex(): Promise<void> {
    console.log('Keyword Search: Creating GIN index for full-text search...');
    
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS songs_search_idx 
        ON songs 
        USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(artist, '')))
      `);
      
      console.log('Keyword Search: GIN index created successfully');
    } catch (error) {
      console.error('Keyword Search: Error creating GIN index:', error);
      throw error;
    }
  }
  
  async dropSearchIndex(): Promise<void> {
    console.log('Keyword Search: Dropping GIN index...');
    
    try {
      await db.execute(sql`
        DROP INDEX IF EXISTS songs_search_idx
      `);
      
      console.log('Keyword Search: GIN index dropped successfully');
    } catch (error) {
      console.error('Keyword Search: Error dropping GIN index:', error);
      throw error;
    }
  }
  
  private sanitizeQuery(query: string): string {
    const words = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.replace(/[^a-z0-9]/g, ''));
    
    return words.join(' & ');
  }
  
  private sanitizeQueryWithPrefix(query: string): string {
    const words = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.replace(/[^a-z0-9]/g, '') + ':*');
    
    return words.join(' & ');
  }
  
  getCacheStats(): { indexExists: boolean } {
    return {
      indexExists: true,
    };
  }
}

export const keywordSearchService = new KeywordSearchService();
