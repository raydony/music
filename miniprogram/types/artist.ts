export type ArtistType = 'MASTER' | 'TEMPLE' | 'SANGHA' | 'MUSICIAN' | 'GROUP' | 'OTHER';

export interface ArtistSummary {
  id: string;
  name: string;
  type: ArtistType;
}

export interface Artist extends ArtistSummary {
  avatarUrl: string | null;
  description: string | null;
}

export interface ArtistView extends Artist {
  typeLabel: string;
}

export interface ArtistAlbum {
  id: string;
  title: string;
  coverUrl: string | null;
  description: string | null;
  publishYear: number | null;
  publishedTrackCount: number;
}

export interface ArtistDetail extends Artist {
  createdAt: string;
  updatedAt: string;
  albums: ArtistAlbum[];
  publishedTrackCount: number;
}

export const ARTIST_TYPE_LABELS: Record<ArtistType, string> = {
  MASTER: '法师',
  TEMPLE: '寺院',
  SANGHA: '僧团',
  MUSICIAN: '音乐家',
  GROUP: '团体',
  OTHER: '其他',
};

export function getArtistTypeLabel(type: ArtistType): string {
  return ARTIST_TYPE_LABELS[type] ?? '其他';
}
