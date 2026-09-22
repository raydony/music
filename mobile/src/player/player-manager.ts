import type { TrackDetail, TrackListItem } from '../api/types';

export interface AudioPort {
  src: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

export interface PlayerSnapshot {
  currentTrack: TrackListItem | null;
  queue: readonly TrackListItem[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loading: boolean;
  error: string | null;
  detail: TrackDetail | null;
  detailLoading: boolean;
  detailError: string | null;
}

const initialSnapshot: PlayerSnapshot = {
  currentTrack: null,
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  loading: false,
  error: null,
  detail: null,
  detailLoading: false,
  detailError: null,
};

function finiteSeconds(value: number): number | null {
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export class PlayerManager {
  private snapshot: PlayerSnapshot = initialSnapshot;
  private readonly subscribers = new Set<() => void>();
  private detailController: AbortController | null = null;
  private trackGeneration = 0;
  private playAttempt = 0;
  private disposed = false;

  private readonly handlers: Record<string, EventListener> = {
    play: () => this.update({ isPlaying: true, error: null }),
    playing: () => this.update({ isPlaying: true, loading: false, error: null }),
    pause: () => this.update({ isPlaying: false, loading: false }),
    ended: () => this.handleEnded(),
    timeupdate: () => {
      const time = finiteSeconds(this.audio.currentTime);
      if (time !== null) this.update({ currentTime: time });
    },
    loadedmetadata: () => this.updateDuration(),
    durationchange: () => this.updateDuration(),
    waiting: () => {
      if (this.snapshot.currentTrack && this.snapshot.isPlaying) this.update({ loading: true });
    },
    canplay: () => this.update({ loading: false }),
    error: () =>
      this.update({ isPlaying: false, loading: false, error: '音频加载失败，请尝试其他曲目。' }),
  };

  constructor(
    private readonly audio: AudioPort,
    private readonly loadDetail: (id: string, signal: AbortSignal) => Promise<TrackDetail>,
  ) {
    for (const [type, listener] of Object.entries(this.handlers)) {
      audio.addEventListener(type, listener);
    }
  }

  getSnapshot = (): PlayerSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  };

  private update(change: Partial<PlayerSnapshot>): void {
    if (this.disposed) return;
    this.snapshot = { ...this.snapshot, ...change };
    for (const listener of this.subscribers) listener();
  }

  playFromQueue(queue: readonly TrackListItem[], index: number): void {
    if (index < 0 || index >= queue.length) return;
    const copy = [...queue];
    this.startTrack(copy, index);
  }

  private startTrack(queue: readonly TrackListItem[], index: number): void {
    const track = queue[index];
    if (!track) return;
    this.trackGeneration += 1;
    this.playAttempt += 1;
    const generation = this.trackGeneration;
    this.detailController?.abort();
    this.audio.pause();
    this.audio.src = track.audioUrl;
    this.update({
      currentTrack: track,
      queue,
      currentIndex: index,
      isPlaying: false,
      currentTime: 0,
      duration: finiteSeconds(track.duration) ?? 0,
      loading: true,
      error: null,
      detail: null,
      detailLoading: true,
      detailError: null,
    });
    // Keep this call in the original click handler's task. Detail fetch never gates audio playback.
    this.tryPlay(generation);
    this.fetchDetail(track.id, generation);
  }

  private tryPlay(generation: number): void {
    const attempt = ++this.playAttempt;
    try {
      void this.audio.play().catch(() => {
        if (generation === this.trackGeneration && attempt === this.playAttempt)
          this.update({
            isPlaying: false,
            loading: false,
            error: '播放未能开始，请点击播放重试。',
          });
      });
    } catch {
      if (generation === this.trackGeneration && attempt === this.playAttempt)
        this.update({ isPlaying: false, loading: false, error: '播放未能开始，请点击播放重试。' });
    }
  }

  private fetchDetail(id: string, generation: number): void {
    const controller = new AbortController();
    this.detailController = controller;
    void this.loadDetail(id, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted && generation === this.trackGeneration)
          this.update({ detail, detailLoading: false });
      })
      .catch(() => {
        if (!controller.signal.aborted && generation === this.trackGeneration)
          this.update({ detailLoading: false, detailError: '歌词暂时无法加载。' });
      });
  }

  pause(): void {
    if (!this.snapshot.currentTrack) return;
    this.playAttempt += 1;
    this.audio.pause();
    this.update({ isPlaying: false, loading: false });
  }

  resume(): void {
    if (!this.snapshot.currentTrack) return;
    this.update({ loading: true, error: null });
    this.tryPlay(this.trackGeneration);
  }

  next(): void {
    const { queue, currentIndex } = this.snapshot;
    if (!queue.length) return;
    this.startTrack(queue, (currentIndex + 1) % queue.length);
  }

  previous(): void {
    const { queue, currentIndex } = this.snapshot;
    if (!queue.length) return;
    this.startTrack(queue, (currentIndex - 1 + queue.length) % queue.length);
  }

  seek(seconds: number): void {
    if (!this.snapshot.currentTrack || !Number.isFinite(seconds)) return;
    const duration = this.snapshot.duration;
    const clamped = Math.max(0, duration > 0 ? Math.min(seconds, duration) : seconds);
    try {
      this.audio.currentTime = clamped;
      this.update({ currentTime: clamped });
    } catch {
      this.update({ error: '暂时无法跳转到该播放位置。' });
    }
  }

  private updateDuration(): void {
    const duration = finiteSeconds(this.audio.duration);
    if (duration !== null && duration > 0) this.update({ duration });
  }

  private handleEnded(): void {
    const { queue, currentIndex, duration } = this.snapshot;
    if (currentIndex < queue.length - 1) this.startTrack(queue, currentIndex + 1);
    else this.update({ isPlaying: false, loading: false, currentTime: duration });
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.detailController?.abort();
    for (const [type, listener] of Object.entries(this.handlers)) {
      this.audio.removeEventListener(type, listener);
    }
    this.audio.pause();
    this.audio.src = '';
    this.subscribers.clear();
  }
}
