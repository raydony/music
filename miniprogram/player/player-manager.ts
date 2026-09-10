import {
  PLAY_MODES,
  PLAY_MODE_STORAGE_KEY,
  createInitialPlayerState,
  isPlayMode,
} from './player-state';
import type { PlayableTrack, PlayerState, PlayerStateListener, PlayMode } from './player-types';

const PLAYBACK_ERROR_MESSAGE = '播放失败，请稍后重试';

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function isUsableCoverUrl(value: string | null | undefined): value is string {
  return Boolean(
    value && /^https:\/\//i.test(value) && !/^https:\/\/example\.com(?:\/|$)/i.test(value),
  );
}

class PlayerManager {
  private audioManager: WechatMiniprogram.BackgroundAudioManager | null = null;
  private listeners = new Set<PlayerStateListener>();
  private eventsRegistered = false;
  private state: PlayerState = createInitialPlayerState();

  initialize(): void {
    if (this.audioManager) {
      return;
    }

    const storedMode = wx.getStorageSync(PLAY_MODE_STORAGE_KEY) as unknown;
    this.state = createInitialPlayerState(isPlayMode(storedMode) ? storedMode : 'sequence');
    this.audioManager = wx.getBackgroundAudioManager();
    this.registerAudioEvents();
  }

  getState(): PlayerState {
    return this.state;
  }

  subscribe(listener: PlayerStateListener): () => void {
    this.initialize();
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setQueue(queue: PlayableTrack[], currentTrackId?: string): void {
    const normalizedQueue = queue.filter((track) => Boolean(track.id && track.audioUrl));
    const selectedId = currentTrackId ?? this.state.currentTrack?.id;
    const currentIndex = selectedId
      ? normalizedQueue.findIndex((track) => track.id === selectedId)
      : -1;
    this.patchState({ queue: normalizedQueue, currentIndex });
  }

  play(track: PlayableTrack, queue?: PlayableTrack[]): void {
    this.playTrack(track, queue);
  }

  playTrack(track: PlayableTrack, queue?: PlayableTrack[]): void {
    this.initialize();
    if (!track.audioUrl) {
      this.handlePlaybackError();
      return;
    }

    if (queue) {
      this.setQueue(queue, track.id);
    } else {
      const existingIndex = this.state.queue.findIndex((item) => item.id === track.id);
      if (existingIndex >= 0) {
        this.patchState({ currentIndex: existingIndex });
      } else {
        this.setQueue([track], track.id);
      }
    }

    if (this.state.currentTrack?.id === track.id) {
      if (this.state.status === 'paused') {
        this.resume();
      } else if (this.state.status === 'error' || this.state.status === 'ended') {
        this.retry();
      }
      return;
    }

    this.startTrack(track);
  }

  playFromQueue(index: number): void {
    const track = this.state.queue[index];
    if (!track) {
      return;
    }
    this.patchState({ currentIndex: index });
    this.startTrack(track);
  }

  pause(): void {
    if (!this.audioManager || this.state.status !== 'playing') {
      return;
    }
    this.audioManager.pause();
  }

  resume(): void {
    this.initialize();
    if (!this.state.currentTrack) {
      return;
    }
    if (this.state.status === 'error' || this.state.status === 'ended') {
      this.retry();
      return;
    }
    this.audioManager?.play();
  }

  retry(): void {
    if (!this.state.currentTrack) {
      return;
    }
    this.startTrack(this.state.currentTrack, true);
  }

  seek(seconds: number): void {
    if (!this.audioManager || !Number.isFinite(seconds)) {
      return;
    }
    const duration = this.getKnownDuration();
    if (duration <= 0) {
      return;
    }
    const nextTime = clamp(seconds, 0, duration);
    this.audioManager.seek(nextTime);
    this.patchProgress(nextTime, duration);
  }

  previous(): void {
    if (this.state.currentTime > 3) {
      this.seek(0);
      return;
    }
    if (this.state.currentIndex > 0) {
      this.playFromQueue(this.state.currentIndex - 1);
      return;
    }
    this.seek(0);
  }

  next(): void {
    const { queue, currentIndex, playMode } = this.state;
    if (!queue.length) {
      return;
    }
    if (playMode === 'shuffle') {
      this.playFromQueue(this.getRandomIndex());
      return;
    }
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      this.playFromQueue(currentIndex + 1);
    }
  }

  setPlayMode(playMode: PlayMode): void {
    if (!PLAY_MODES.includes(playMode)) {
      return;
    }
    wx.setStorageSync(PLAY_MODE_STORAGE_KEY, playMode);
    this.patchState({ playMode });
  }

  cyclePlayMode(): void {
    const index = PLAY_MODES.indexOf(this.state.playMode);
    this.setPlayMode(PLAY_MODES[(index + 1) % PLAY_MODES.length]);
  }

  updateCurrentTrackDetails(details: PlayableTrack): void {
    if (this.state.currentTrack?.id !== details.id) {
      return;
    }
    const mergedTrack = { ...this.state.currentTrack, ...details };
    const queue = this.state.queue.map((track) =>
      track.id === details.id ? { ...track, ...details } : track,
    );
    this.patchState({ currentTrack: mergedTrack, queue });
  }

  reset(): void {
    this.audioManager?.stop();
    const playMode = this.state.playMode;
    this.state = createInitialPlayerState(playMode);
    this.emit();
  }

  private startTrack(track: PlayableTrack, forceReload = false): void {
    this.initialize();
    const audio = this.audioManager;
    if (!audio) {
      return;
    }

    if (!forceReload && this.state.currentTrack?.id === track.id && audio.src === track.audioUrl) {
      audio.play();
      return;
    }

    const queueIndex = this.state.queue.findIndex((item) => item.id === track.id);
    this.patchState({
      currentTrack: track,
      currentIndex: queueIndex,
      status: 'loading',
      currentTime: 0,
      duration: track.duration,
      progress: 0,
    });

    audio.title = track.title;
    audio.singer = track.artist.name;
    audio.epname = track.album?.title ?? track.category?.name ?? '佛教音乐';
    if (isUsableCoverUrl(track.coverUrl)) {
      audio.coverImgUrl = track.coverUrl;
    }
    audio.startTime = 0;
    audio.src = track.audioUrl;
  }

  private registerAudioEvents(): void {
    if (!this.audioManager || this.eventsRegistered) {
      return;
    }
    this.eventsRegistered = true;
    const audio = this.audioManager;

    audio.onPlay(() => {
      this.patchState({ status: 'playing' });
    });
    audio.onPause(() => {
      this.patchState({ status: 'paused' });
    });
    audio.onStop(() => {
      this.patchState({ status: 'ended' });
    });
    audio.onEnded(() => {
      this.handleEnded();
    });
    audio.onTimeUpdate(() => {
      const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const duration =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : this.getKnownDuration();
      this.patchProgress(currentTime, duration);
    });
    audio.onWaiting(() => {
      if (this.state.status !== 'error' && this.state.status !== 'ended') {
        this.patchState({ status: 'loading' });
      }
    });
    audio.onCanplay(() => {
      if (this.state.status === 'loading' && !audio.paused) {
        this.patchState({ status: 'playing' });
      }
    });
    audio.onError(() => {
      this.handlePlaybackError();
    });
    audio.onPrev(() => {
      this.previous();
    });
    audio.onNext(() => {
      this.next();
    });
  }

  private handleEnded(): void {
    const { playMode, queue, currentIndex, currentTrack } = this.state;
    if (!currentTrack) {
      return;
    }
    if (playMode === 'repeat-one') {
      this.startTrack(currentTrack, true);
      return;
    }
    if (playMode === 'shuffle' && queue.length) {
      this.playFromQueue(this.getRandomIndex());
      return;
    }
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      this.playFromQueue(currentIndex + 1);
      return;
    }
    const duration = this.getKnownDuration();
    this.patchState({
      status: 'ended',
      currentTime: duration,
      duration,
      progress: duration > 0 ? 100 : 0,
    });
  }

  private getRandomIndex(): number {
    const { queue, currentIndex } = this.state;
    if (queue.length <= 1) {
      return 0;
    }
    const offset = 1 + Math.floor(Math.random() * (queue.length - 1));
    return (Math.max(currentIndex, 0) + offset) % queue.length;
  }

  private getKnownDuration(): number {
    if (this.state.duration > 0) {
      return this.state.duration;
    }
    return this.state.currentTrack?.duration ?? 0;
  }

  private patchProgress(currentTime: number, duration: number): void {
    const safeDuration = Math.max(0, duration);
    const safeCurrentTime = clamp(currentTime, 0, safeDuration || currentTime);
    this.patchState({
      currentTime: safeCurrentTime,
      duration: safeDuration,
      progress: safeDuration > 0 ? clamp((safeCurrentTime / safeDuration) * 100, 0, 100) : 0,
    });
  }

  private handlePlaybackError(): void {
    this.patchState({ status: 'error' });
    wx.showToast({ title: PLAYBACK_ERROR_MESSAGE, icon: 'none' });
  }

  private patchState(patch: Partial<PlayerState>): void {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

export const playerManager = new PlayerManager();
