-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to songs table (will be handled by drizzle-kit push)
-- ALTER TABLE songs ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create HNSW index for vector similarity search
-- This will be created after the column is added
CREATE INDEX IF NOT EXISTS songs_embedding_idx ON songs USING hnsw (embedding vector_cosine_ops);
