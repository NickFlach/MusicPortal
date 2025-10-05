-- Add music intelligence features to songs table
-- This enables the moonshot: discovering universal intelligence in music

-- Music Features (extracted from audio analysis)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS tempo DECIMAL(6,2);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS musical_key TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS musical_mode TEXT CHECK(musical_mode IN ('major', 'minor'));
ALTER TABLE songs ADD COLUMN IF NOT EXISTS time_signature TEXT;

-- Harmonic features
ALTER TABLE songs ADD COLUMN IF NOT EXISTS harmonic_complexity DECIMAL(3,2);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS harmonic_entropy DECIMAL(6,3);

-- Rhythmic features  
ALTER TABLE songs ADD COLUMN IF NOT EXISTS rhythmic_complexity DECIMAL(3,2);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS syncopation DECIMAL(3,2);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS groove DECIMAL(3,2);

-- Timbral features
ALTER TABLE songs ADD COLUMN IF NOT EXISTS brightness DECIMAL(3,2);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS roughness DECIMAL(3,2);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS warmth DECIMAL(3,2);

-- Emotional/perceptual features
ALTER TABLE songs ADD COLUMN IF NOT EXISTS energy DECIMAL(3,2);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS valence DECIMAL(3,2);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS arousal DECIMAL(3,2);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS tension DECIMAL(3,2);

-- Structural features
ALTER TABLE songs ADD COLUMN IF NOT EXISTS section_count INTEGER;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS repetition_score DECIMAL(3,2);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS novelty_score DECIMAL(3,2);

-- Meta features
ALTER TABLE songs ADD COLUMN IF NOT EXISTS danceability DECIMAL(3,2);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS acousticness DECIMAL(3,2);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS instrumentalness DECIMAL(3,2);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS liveness DECIMAL(3,2);

-- Analysis metadata
ALTER TABLE songs ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS analysis_version TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS analysis_confidence DECIMAL(3,2);

-- Create table for discovered patterns
CREATE TABLE IF NOT EXISTS musical_patterns (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  feature_correlations JSONB NOT NULL,
  cultural_distribution JSONB,
  temporal_distribution JSONB,
  sample_size INTEGER NOT NULL,
  statistical_significance DECIMAL(10,8) NOT NULL,
  effect_size DECIMAL(4,3),
  universality_score DECIMAL(3,2),
  cross_cultural_consistency DECIMAL(3,2),
  predictive_power DECIMAL(3,2),
  discovered_at TIMESTAMP DEFAULT NOW(),
  exemplar_songs INTEGER[],
  confidence DECIMAL(3,2) NOT NULL
);

-- Create table for musical hypotheses
CREATE TABLE IF NOT EXISTS musical_hypotheses (
  id TEXT PRIMARY KEY,
  statement TEXT NOT NULL,
  testable_features TEXT[] NOT NULL,
  expected_correlations JSONB NOT NULL,
  control_conditions TEXT[],
  supporting_evidence INTEGER DEFAULT 0,
  contradicting_evidence INTEGER DEFAULT 0,
  bayesian_confidence DECIMAL(3,2) NOT NULL,
  required_sample_size INTEGER NOT NULL,
  current_sample_size INTEGER DEFAULT 0,
  test_status TEXT CHECK(test_status IN ('proposed', 'testing', 'validated', 'refuted')) DEFAULT 'proposed',
  generated_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),
  parent_pattern TEXT REFERENCES musical_patterns(id)
);

-- Create table for emergence indicators
CREATE TABLE IF NOT EXISTS emergence_indicators (
  id SERIAL PRIMARY KEY,
  type TEXT CHECK(type IN ('novel_discovery', 'self_modification', 'emergent_behavior', 'predictive_success')) NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB NOT NULL,
  significance DECIMAL(3,2) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_songs_tempo ON songs(tempo);
CREATE INDEX IF NOT EXISTS idx_songs_key ON songs(musical_key);
CREATE INDEX IF NOT EXISTS idx_songs_energy ON songs(energy);
CREATE INDEX IF NOT EXISTS idx_songs_valence ON songs(valence);
CREATE INDEX IF NOT EXISTS idx_songs_analyzed ON songs(analyzed_at);

CREATE INDEX IF NOT EXISTS idx_patterns_universality ON musical_patterns(universality_score);
CREATE INDEX IF NOT EXISTS idx_patterns_discovered ON musical_patterns(discovered_at);

CREATE INDEX IF NOT EXISTS idx_hypotheses_status ON musical_hypotheses(test_status);
CREATE INDEX IF NOT EXISTS idx_hypotheses_confidence ON musical_hypotheses(bayesian_confidence);

CREATE INDEX IF NOT EXISTS idx_emergence_type ON emergence_indicators(type);
CREATE INDEX IF NOT EXISTS idx_emergence_timestamp ON emergence_indicators(timestamp);

-- Add comments for documentation
COMMENT ON COLUMN songs.tempo IS 'Beats per minute (BPM)';
COMMENT ON COLUMN songs.energy IS 'Musical energy level (0-1)';
COMMENT ON COLUMN songs.valence IS 'Musical happiness/positivity (0-1)';
COMMENT ON TABLE musical_patterns IS 'Discovered universal patterns across music';
COMMENT ON TABLE musical_hypotheses IS 'System-generated hypotheses about music';
COMMENT ON TABLE emergence_indicators IS 'Evidence of emergent intelligence/consciousness';
