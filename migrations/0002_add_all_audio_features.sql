-- Migration: Add all audio features extracted by Web Audio API
-- Date: 2025-01-05
-- Purpose: Complete database schema to store ALL 30+ audio features

-- Add missing musical feature columns to songs table
ALTER TABLE songs 
  -- Harmonic features
  ADD COLUMN IF NOT EXISTS harmonic_complexity DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS harmonic_entropy DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS dominant_frequencies JSONB,
  ADD COLUMN IF NOT EXISTS spectral_centroid DECIMAL(7,2),
  ADD COLUMN IF NOT EXISTS spectral_rolloff DECIMAL(7,2),
  
  -- Rhythmic features
  ADD COLUMN IF NOT EXISTS rhythmic_complexity DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS syncopation DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS groove DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS beat_strength DECIMAL(3,2),
  
  -- Timbral features
  ADD COLUMN IF NOT EXISTS brightness DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS roughness DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS warmth DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS spectral_flux DECIMAL(5,2),
  
  -- Emotional/perceptual features
  ADD COLUMN IF NOT EXISTS arousal DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS tension DECIMAL(3,2),
  
  -- Structural features
  ADD COLUMN IF NOT EXISTS section_count INTEGER,
  ADD COLUMN IF NOT EXISTS repetition_score DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS novelty_score DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS dynamic_range DECIMAL(5,2),
  
  -- Meta features
  ADD COLUMN IF NOT EXISTS acousticness DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS instrumentalness DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS liveness DECIMAL(3,2),
  
  -- Quality metrics
  ADD COLUMN IF NOT EXISTS loudness DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS zero_crossing_rate DECIMAL(5,4),
  ADD COLUMN IF NOT EXISTS rms DECIMAL(5,4);

-- Add intelligence tables for pattern detection, hypotheses, and emergence

-- Table for discovered musical patterns
CREATE TABLE IF NOT EXISTS musical_patterns (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  feature_correlations JSONB NOT NULL,
  cultural_distribution JSONB,
  temporal_distribution JSONB,
  sample_size INTEGER NOT NULL,
  statistical_significance DECIMAL(10, 8),  -- p-value
  effect_size DECIMAL(5, 3),
  universality_score DECIMAL(3, 2),
  cross_cultural_consistency DECIMAL(3, 2),
  predictive_power DECIMAL(3, 2),
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  exemplar_songs INTEGER[],
  confidence DECIMAL(3, 2)
);

-- Table for musical hypotheses
CREATE TABLE IF NOT EXISTS musical_hypotheses (
  id TEXT PRIMARY KEY,
  statement TEXT NOT NULL,
  testable_features TEXT[],
  expected_correlations JSONB,
  control_conditions TEXT[],
  supporting_evidence INTEGER DEFAULT 0,
  contradicting_evidence INTEGER DEFAULT 0,
  bayesian_confidence DECIMAL(3, 2),
  required_sample_size INTEGER,
  current_sample_size INTEGER,
  test_status TEXT NOT NULL CHECK (test_status IN ('proposed', 'testing', 'validated', 'refuted')),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  parent_pattern TEXT REFERENCES musical_patterns(id)
);

-- Table for emergence indicators (evidence of consciousness)
CREATE TABLE IF NOT EXISTS emergence_indicators (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('novel_discovery', 'self_modification', 'emergent_behavior', 'predictive_success')),
  description TEXT NOT NULL,
  evidence JSONB,
  significance DECIMAL(3, 2),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_songs_analyzed ON songs(analyzed_at) WHERE analyzed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_songs_tempo ON songs(tempo) WHERE tempo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_songs_key ON songs(musical_key) WHERE musical_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_songs_energy ON songs(energy) WHERE energy IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patterns_discovered ON musical_patterns(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_significance ON musical_patterns(statistical_significance) WHERE statistical_significance < 0.05;
CREATE INDEX IF NOT EXISTS idx_hypotheses_status ON musical_hypotheses(test_status);
CREATE INDEX IF NOT EXISTS idx_emergence_type ON emergence_indicators(type);
CREATE INDEX IF NOT EXISTS idx_emergence_significance ON emergence_indicators(significance DESC);

-- Add comments for documentation
COMMENT ON TABLE musical_patterns IS 'Discovered patterns across songs (e.g., key-energy correlations)';
COMMENT ON TABLE musical_hypotheses IS 'Generated hypotheses and their test results';
COMMENT ON TABLE emergence_indicators IS 'Evidence of emergent intelligence/consciousness';
