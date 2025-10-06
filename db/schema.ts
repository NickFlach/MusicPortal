import { pgTable, text, serial, integer, timestamp, boolean, decimal, jsonb, customType } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  address: text("address").unique().notNull(),
  username: text("username"),
  isAdmin: boolean("is_admin").default(false),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  lastSeen: timestamp("last_seen").defaultNow(),
});

// Rename likes table to loves
export const loves = pgTable("loves", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").references(() => songs.id),
  address: text("address").references(() => users.address),
  createdAt: timestamp("created_at").defaultNow(),
});

export const followers = pgTable("followers", {
  id: serial("id").primaryKey(),
  followerId: text("follower_id").references(() => users.address),
  followingId: text("following_id").references(() => users.address),
  createdAt: timestamp("created_at").defaultNow(),
});

export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist"),
  ipfsHash: text("ipfs_hash").notNull(),
  uploadedBy: text("uploaded_by").references(() => users.address),
  createdAt: timestamp("created_at").defaultNow(),
  votes: integer("votes").default(0),
  embedding: vector("embedding"),
  
  // Basic audio features
  tempo: decimal("tempo", { precision: 5, scale: 2 }),
  musicalKey: text("musical_key"),
  musicalMode: text("musical_mode"),
  timeSignature: text("time_signature"),
  
  // Harmonic features
  harmonicComplexity: decimal("harmonic_complexity", { precision: 3, scale: 2 }),
  harmonicEntropy: decimal("harmonic_entropy", { precision: 5, scale: 2 }),
  dominantFrequencies: jsonb("dominant_frequencies"),
  spectralCentroid: decimal("spectral_centroid", { precision: 7, scale: 2 }),
  spectralRolloff: decimal("spectral_rolloff", { precision: 7, scale: 2 }),
  
  // Rhythmic features
  rhythmicComplexity: decimal("rhythmic_complexity", { precision: 3, scale: 2 }),
  syncopation: decimal("syncopation", { precision: 3, scale: 2 }),
  groove: decimal("groove", { precision: 3, scale: 2 }),
  beatStrength: decimal("beat_strength", { precision: 3, scale: 2 }),
  
  // Timbral features
  brightness: decimal("brightness", { precision: 3, scale: 2 }),
  roughness: decimal("roughness", { precision: 3, scale: 2 }),
  warmth: decimal("warmth", { precision: 3, scale: 2 }),
  spectralFlux: decimal("spectral_flux", { precision: 5, scale: 2 }),
  
  // Emotional/perceptual features
  energy: decimal("energy", { precision: 3, scale: 2 }),
  valence: decimal("valence", { precision: 3, scale: 2 }),
  arousal: decimal("arousal", { precision: 3, scale: 2 }),
  tension: decimal("tension", { precision: 3, scale: 2 }),
  
  // Structural features
  sectionCount: integer("section_count"),
  repetitionScore: decimal("repetition_score", { precision: 3, scale: 2 }),
  noveltyScore: decimal("novelty_score", { precision: 3, scale: 2 }),
  dynamicRange: decimal("dynamic_range", { precision: 5, scale: 2 }),
  
  // Meta features
  danceability: decimal("danceability", { precision: 3, scale: 2 }),
  acousticness: decimal("acousticness", { precision: 3, scale: 2 }),
  instrumentalness: decimal("instrumentalness", { precision: 3, scale: 2 }),
  liveness: decimal("liveness", { precision: 3, scale: 2 }),
  
  // Quality metrics
  loudness: decimal("loudness", { precision: 5, scale: 2 }),
  zeroCrossingRate: decimal("zero_crossing_rate", { precision: 5, scale: 4 }),
  rms: decimal("rms", { precision: 5, scale: 4 }),
  
  // Analysis metadata
  analyzedAt: timestamp("analyzed_at"),
  analysisVersion: text("analysis_version"),
});

export const recentlyPlayed = pgTable("recently_played", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").references(() => songs.id),
  playedAt: timestamp("played_at").defaultNow(),
});

export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: text("created_by").references(() => users.address),
  createdAt: timestamp("created_at").defaultNow(),
  isPublic: boolean("is_public").default(true),
});

export const playlistSongs = pgTable("playlist_songs", {
  id: serial("id").primaryKey(),
  playlistId: integer("playlist_id").references(() => playlists.id),
  songId: integer("song_id").references(() => songs.id),
  position: integer("position").notNull(),
});

export const userRewards = pgTable("user_rewards", {
  id: serial("id").primaryKey(),
  address: text("address").references(() => users.address),
  uploadRewardClaimed: boolean("upload_reward_claimed").default(false),
  playlistRewardClaimed: boolean("playlist_reward_claimed").default(false),
  nftRewardClaimed: boolean("nft_reward_claimed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const listeners = pgTable("listeners", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").references(() => songs.id),
  countryCode: text("country_code").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 6 }),
  longitude: decimal("longitude", { precision: 10, scale: 6 }),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const lumiraMetrics = pgTable("lumira_metrics", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull(),
  dataType: text("data_type").notNull(),
  data: jsonb("data").notNull(),
  metadata: jsonb("metadata").notNull(),
});

// Intelligence Engine Tables

export const musicalPatterns = pgTable("musical_patterns", {
  id: text("id").primaryKey(),
  description: text("description").notNull(),
  featureCorrelations: jsonb("feature_correlations").notNull(),
  culturalDistribution: jsonb("cultural_distribution"),
  temporalDistribution: jsonb("temporal_distribution"),
  sampleSize: integer("sample_size").notNull(),
  statisticalSignificance: decimal("statistical_significance", { precision: 10, scale: 8 }),
  effectSize: decimal("effect_size", { precision: 5, scale: 3 }),
  universalityScore: decimal("universality_score", { precision: 3, scale: 2 }),
  crossCulturalConsistency: decimal("cross_cultural_consistency", { precision: 3, scale: 2 }),
  predictivePower: decimal("predictive_power", { precision: 3, scale: 2 }),
  discoveredAt: timestamp("discovered_at").defaultNow(),
  exemplarSongs: integer("exemplar_songs").array(),
  confidence: decimal("confidence", { precision: 3, scale: 2 })
});

export const musicalHypotheses = pgTable("musical_hypotheses", {
  id: text("id").primaryKey(),
  statement: text("statement").notNull(),
  testableFeatures: text("testable_features").array(),
  expectedCorrelations: jsonb("expected_correlations"),
  controlConditions: text("control_conditions").array(),
  supportingEvidence: integer("supporting_evidence").default(0),
  contradictingEvidence: integer("contradicting_evidence").default(0),
  bayesianConfidence: decimal("bayesian_confidence", { precision: 3, scale: 2 }),
  requiredSampleSize: integer("required_sample_size"),
  currentSampleSize: integer("current_sample_size"),
  testStatus: text("test_status").notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  parentPattern: text("parent_pattern")
});

export const emergenceIndicators = pgTable("emergence_indicators", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  evidence: jsonb("evidence"),
  significance: decimal("significance", { precision: 3, scale: 2 }),
  timestamp: timestamp("timestamp").defaultNow()
});

// Update relations for loves
export const lovesRelations = relations(loves, ({ one }) => ({
  song: one(songs, {
    fields: [loves.songId],
    references: [songs.id],
  }),
  user: one(users, {
    fields: [loves.address],
    references: [users.address],
  }),
}));

// Update songs relations to include loves
export const songsRelations = relations(songs, ({ many, one }) => ({
  recentPlays: many(recentlyPlayed),
  playlistSongs: many(playlistSongs),
  loves: many(loves),
  uploader: one(users, {
    fields: [songs.uploadedBy],
    references: [users.address],
  }),
}));

export const playlistsRelations = relations(playlists, ({ many, one }) => ({
  playlistSongs: many(playlistSongs),
  creator: one(users, {
    fields: [playlists.createdBy],
    references: [users.address],
  }),
}));

export const playlistSongsRelations = relations(playlistSongs, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistSongs.playlistId],
    references: [playlists.id],
  }),
  song: one(songs, {
    fields: [playlistSongs.songId],
    references: [songs.id],
  }),
}));

// Update users relations to include loves
export const usersRelations = relations(users, ({ many }) => ({
  followers: many(followers, { relationName: "followers" }),
  following: many(followers, { relationName: "following" }),
  songs: many(songs, { relationName: "uploaded_songs" }),
  playlists: many(playlists, { relationName: "created_playlists" }),
  rewards: many(userRewards),
  loves: many(loves),
}));

export const recentlyPlayedRelations = relations(recentlyPlayed, ({ one }) => ({
  song: one(songs, {
    fields: [recentlyPlayed.songId],
    references: [songs.id],
  }),
}));

export const listenersRelations = relations(listeners, ({ one }) => ({
  song: one(songs, {
    fields: [listeners.songId],
    references: [songs.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
export type UserRewards = typeof userRewards.$inferSelect;
export type LumiraMetric = typeof lumiraMetrics.$inferSelect;
export type Love = typeof loves.$inferSelect;