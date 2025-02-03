import { db } from '@db';
import { songs } from '@db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import type { SongMetadata } from '@/types/song';

export interface MusicStats {
  totalSongs: number;
  totalArtists: number;
  totalListens: number;
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

  // Use votes as a proxy for listens since we don't have a plays field
  const [
    { sum: totalListens }
  ] = await db.select({
    sum: sql<number>`coalesce(sum(${songs.votes}), 0)`
  }).from(songs);

  const topArtists = await db.select({
    artist: songs.artist,
    songCount: sql<number>`count(*)`
  })
  .from(songs)
  .where(sql`${songs.artist} is not null`)  // Only count non-null artists
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
    totalListens,
    topArtists: topArtists.map(({ artist, songCount }) => ({
      artist: artist || 'Unknown',
      songCount
    })),
    recentUploads
  };
}

export async function getSongMetadata(id: number): Promise<SongMetadata | null> {
  const [song] = await db.select()
    .from(songs)
    .where(eq(songs.id, id));

  if (!song) return null;

  const baseUrl = process.env.BASE_URL || 'https://neo-music-portal.repl.co';
  const defaultImage = `${baseUrl}/default-album-art.png`;
  const albumArtUrl = song.albumArtIpfsHash 
    ? `https://gateway.pinata.cloud/ipfs/${song.albumArtIpfsHash}`
    : defaultImage;

  return {
    openGraph: {
      title: `${song.title} by ${song.artist || 'Unknown Artist'}`,
      description: song.description || `Listen to "${song.title}" by ${song.artist || 'Unknown Artist'} on NEO Music Portal`,
      image: albumArtUrl,
      type: 'music.song',
      musician: song.artist || undefined,
      album: song.albumName || undefined,
      duration: song.duration || undefined,
      genre: song.genre || undefined
    },
    twitterCard: {
      card: song.albumArtIpfsHash ? 'summary_large_image' : 'player',
      site: '@NEOMusicPortal',
      title: `${song.title} by ${song.artist || 'Unknown Artist'}`,
      description: song.description || `Listen to "${song.title}" by ${song.artist || 'Unknown Artist'} on NEO Music Portal`,
      image: albumArtUrl,
      player: `${baseUrl}/embed/${song.id}`
    },
    schemaOrg: {
      '@context': 'https://schema.org',
      '@type': 'MusicRecording',
      name: song.title,
      byArtist: {
        '@type': 'MusicGroup',
        name: song.artist || 'Unknown Artist'
      },
      ...(song.albumName && {
        inAlbum: {
          '@type': 'MusicAlbum',
          name: song.albumName
        }
      }),
      duration: song.duration ? `PT${Math.floor(song.duration / 60)}M${song.duration % 60}S` : undefined,
      genre: song.genre || undefined,
      datePublished: song.createdAt?.toISOString(),
      image: albumArtUrl
    }
  };
}

export async function incrementListenCount(id: number) {
  await db.update(songs)
    .set({ votes: sql`coalesce(${songs.votes}, 0) + 1` })
    .where(eq(songs.id, id));
}