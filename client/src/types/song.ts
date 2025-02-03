export interface Song {
  id: number;
  title: string;
  artist: string;
  ipfsHash: string;
  uploadedBy: string | null;
  createdAt: string | null;
  votes: number | null;
  // New metadata fields
  albumArtIpfsHash?: string;
  albumName?: string;
  genre?: string;
  releaseYear?: number;
  duration?: number;
  description?: string;
  isExplicit?: boolean;
  license?: string;
  bpm?: number;
  key?: string;
  tags?: string;
}

export interface SongMetadata {
  openGraph: {
    title: string;
    description: string;
    image: string;
    type: 'music.song';
    musician?: string;
    album?: string;
    duration?: number;
    genre?: string;
  };
  twitterCard: {
    card: 'player' | 'summary_large_image';
    site: string;
    title: string;
    description: string;
    image: string;
    player?: string;
  };
  schemaOrg: {
    '@context': 'https://schema.org';
    '@type': 'MusicRecording';
    name: string;
    byArtist: {
      '@type': 'MusicGroup';
      name: string;
    };
    inAlbum?: {
      '@type': 'MusicAlbum';
      name: string;
    };
    duration?: string;
    genre?: string;
    datePublished?: string;
    image?: string;
  };
}