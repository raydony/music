import type { AlbumSummary, CategorySummary } from '../types/track';
import type { ArtistSummary } from '../types/artist';

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export type PlayMode = 'sequence' | 'repeat-one' | 'shuffle';

export interface PlayableTrack {
  id: string;
  title: string;
  subtitle?: string | null;
  audioUrl: string;
  coverUrl?: string | null;
  duration: number;
  artist: ArtistSummary;
  album?: AlbumSummary | null;
  category?: CategorySummary;
  lyrics?: string | null;
  lyricsLrc?: string | null;
}

export interface PlayerState {
  currentTrack: PlayableTrack | null;
  queue: PlayableTrack[];
  currentIndex: number;
  status: PlayerStatus;
  currentTime: number;
  duration: number;
  progress: number;
  playMode: PlayMode;
}

export type PlayerStateListener = (state: PlayerState) => void;
