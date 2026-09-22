export interface ArtistSummary {
  id: string;
  name: string;
  type: string;
}

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

export interface Category {
  id: string;
  name: string;
  description: string | null;
  publishedTrackCount: number;
}

export interface AlbumListItem {
  id: string;
  title: string;
  coverUrl: string | null;
  description: string | null;
  publishYear: number | null;
  artist: ArtistSummary;
  publishedTrackCount: number;
}

export interface AlbumDetail extends Omit<AlbumListItem, 'publishedTrackCount'> {
  tracks: TrackListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface TrackDetail extends TrackListItem {
  lyrics: string | null;
  lyricsLrc: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PageResponse<T> {
  data: T[];
  meta: PageMeta;
}
