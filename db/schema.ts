import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  address: text("address").unique().notNull(),
  username: text("username"),
  isAdmin: boolean("is_admin").default(false),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  lastSeen: timestamp("last_seen").defaultNow(),
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
  // New metadata fields
  albumArtIpfsHash: text("album_art_ipfs_hash"),
  albumName: text("album_name"),
  genre: text("genre"),
  releaseYear: integer("release_year"),
  duration: integer("duration"), // Duration in seconds
  description: text("description"),
  isExplicit: boolean("is_explicit").default(false),
  license: text("license"),
  bpm: integer("bpm"), // Beats per minute
  key: text("key"), // Musical key
  tags: text("tags")
});

export const recentlyPlayed = pgTable("recently_played", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").references(() => songs.id),
  playedBy: text("played_by").references(() => users.address),
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

// Relations
export const songsRelations = relations(songs, ({ many, one }) => ({
  recentPlays: many(recentlyPlayed),
  playlistSongs: many(playlistSongs),
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

export const usersRelations = relations(users, ({ many }) => ({
  followers: many(followers, { relationName: "followers" }),
  following: many(followers, { relationName: "following" }),
  songs: many(songs, { relationName: "uploaded_songs" }),
  playlists: many(playlists, { relationName: "created_playlists" }),
  rewards: many(userRewards),
}));

export const recentlyPlayedRelations = relations(recentlyPlayed, ({ one }) => ({
  song: one(songs, {
    fields: [recentlyPlayed.songId],
    references: [songs.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
export type UserRewards = typeof userRewards.$inferSelect;