import type { ArtistSummary } from './artist';

export interface AlbumSummary {
  id: string;
  title: string;
}

export interface CategorySummary {
  id: string;
  name: string;
}

export interface TrackListItem {
  id: string;
  title: string;
  subtitle: string | null;
  audioUrl: string;
  coverUrl: string | null;
  duration: number;
  trackNumber: number | null;
  artist: ArtistSummary;
  album: AlbumSummary | null;
  category: CategorySummary;
}

export interface TrackView extends TrackListItem {
  durationLabel: string;
}

export interface TrackDetail extends TrackListItem {
  lyrics: string | null;
  lyricsLrc: string | null;
  createdAt: string;
  updatedAt: string;
}
