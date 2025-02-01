import { db } from '@db';
import { songs } from '@db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export interface MusicStats {
  totalSongs: number;
  totalArtists: number;
  totalPlays: number;
  topArtists: Array<{ artist: string; songCount: number }>;
  recentUploads: Array<typeof songs.$inferSelect>;
}

export async function getMusicStats(): Promise<MusicStats> {
  const [
    { count: totalSongs }
  ] = await db.select({
    count: sql<number>`count(*)`
  }).from(songs);

  const [
    { count: totalArtists }
  ] = await db.select({
    count: sql<number>`count(distinct ${songs.artist})`
  }).from(songs);

  const [
    { sum: totalPlays }
  ] = await db.select({
    sum: sql<number>`coalesce(sum(${songs.plays}), 0)`
  }).from(songs);

  const topArtists = await db.select({
    artist: songs.artist,
    songCount: sql<number>`count(*)`
  })
  .from(songs)
  .groupBy(songs.artist)
  .orderBy(sql`count(*) desc`)
  .limit(10);

  const recentUploads = await db.select()
    .from(songs)
    .orderBy(desc(songs.createdAt))
    .limit(5);

  return {
    totalSongs,
    totalArtists,
    totalPlays,
    topArtists,
    recentUploads
  };
}

export async function getSongMetadata(id: number) {
  const [song] = await db.select()
    .from(songs)
    .where(eq(songs.id, id));
  
  return song;
}

export async function incrementPlayCount(id: number) {
  await db.update(songs)
    .set({ plays: sql`${songs.plays} + 1` })
    .where(eq(songs.id, id));
}
