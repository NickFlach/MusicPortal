import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
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

export const usersRelations = relations(users, ({ many }) => ({
  followers: many(followers, { relationName: "following" }),
  following: many(followers, { relationName: "followers" }),
}));

export const playlistsRelations = relations(playlists, ({ many }) => ({
  playlistSongs: many(playlistSongs),
}));

export const songsRelations = relations(songs, ({ many }) => ({
  playlistSongs: many(playlistSongs),
  votes: many(votes),
}));

export type User = typeof users.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;