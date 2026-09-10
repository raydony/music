export const artistTypes = ['MASTER', 'TEMPLE', 'SANGHA', 'MUSICIAN', 'GROUP', 'OTHER'] as const;

export type ArtistType = (typeof artistTypes)[number];

export const artistTypeLabels: Record<ArtistType, string> = {
  MASTER: '法师',
  TEMPLE: '寺院',
  SANGHA: '僧团',
  MUSICIAN: '音乐家',
  GROUP: '团体',
  OTHER: '其他',
};

export interface ArtistSummary {
  id: string;
  name: string;
  type: ArtistType;
}

export interface AlbumSummary {
  id: string;
  title: string;
}

export interface CategorySummary {
  id: string;
  name: string;
}

export interface Artist extends ArtistSummary {
  avatarUrl: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { albums: number; tracks: number };
}

export interface Album {
  id: string;
  title: string;
  coverUrl: string | null;
  description: string | null;
  artistId: string;
  publishYear: number | null;
  createdAt: string;
  updatedAt: string;
  artist: ArtistSummary;
  _count?: { tracks: number };
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { tracks: number };
}

export interface Track {
  id: string;
  title: string;
  subtitle: string | null;
  artistId: string;
  albumId: string | null;
  categoryId: string;
  audioUrl: string;
  coverUrl: string | null;
  duration: number;
  lyrics: string | null;
  lyricsLrc: string | null;
  trackNumber: number | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  artist: ArtistSummary;
  album: AlbumSummary | null;
  category: CategorySummary;
}

export interface ArtistInput {
  name: string;
  avatarUrl?: string | null;
  description?: string | null;
  type?: ArtistType;
}

export interface AlbumInput {
  title: string;
  artistId: string;
  publishYear?: number | null;
  coverUrl?: string | null;
  description?: string | null;
}

export interface CategoryInput {
  name: string;
  description?: string | null;
}

export interface TrackInput {
  title: string;
  subtitle?: string | null;
  artistId: string;
  albumId?: string | null;
  categoryId: string;
  audioUrl: string;
  coverUrl?: string | null;
  duration: number;
  lyrics?: string | null;
  lyricsLrc?: string | null;
  trackNumber?: number | null;
  isPublished?: boolean;
}
