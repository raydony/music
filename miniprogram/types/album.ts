import type { ArtistSummary } from './artist';
import type { TrackListItem } from './track';

export interface Album {
  id: string;
  title: string;
  coverUrl: string | null;
  description: string | null;
  publishYear: number | null;
  artist: ArtistSummary;
  publishedTrackCount: number;
}

export interface AlbumDetail {
  id: string;
  title: string;
  coverUrl: string | null;
  description: string | null;
  publishYear: number | null;
  createdAt: string;
  updatedAt: string;
  artist: ArtistSummary;
  tracks: TrackListItem[];
}
