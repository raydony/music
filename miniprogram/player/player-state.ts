import type { PlayMode, PlayerState } from './player-types';

export const PLAY_MODE_STORAGE_KEY = 'buddhist-music:play-mode';

export const PLAY_MODES: PlayMode[] = ['sequence', 'repeat-one', 'shuffle'];

export function isPlayMode(value: unknown): value is PlayMode {
  return typeof value === 'string' && PLAY_MODES.includes(value as PlayMode);
}

export function createInitialPlayerState(playMode: PlayMode = 'sequence'): PlayerState {
  return {
    currentTrack: null,
    queue: [],
    currentIndex: -1,
    status: 'idle',
    currentTime: 0,
    duration: 0,
    progress: 0,
    playMode,
  };
}
