import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  address: text("address").unique().notNull(),
  username: text("username"),
  isAdmin: boolean("is_admin").default(false),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
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

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").references(() => songs.id),
  address: text("address").references(() => users.address),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const songsRelations = relations(songs, ({ many }) => ({
  recentPlays: many(recentlyPlayed),
  votes: many(votes),
  playlistSongs: many(playlistSongs)
}));

export const playlistsRelations = relations(playlists, ({ many }) => ({
  playlistSongs: many(playlistSongs)
}));

export const usersRelations = relations(users, ({ many }) => ({
  followers: many(followers),
  following: many(followers)
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