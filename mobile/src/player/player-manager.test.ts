import { describe, expect, it, vi } from 'vitest';
import type { TrackDetail, TrackListItem } from '../api/types';
import { PlayerManager } from './player-manager';
import type { AudioPort } from './player-manager';

function track(id: string): TrackListItem {
  return {
    id,
    title: `曲目 ${id}`,
    subtitle: null,
    audioUrl: `https://media.example.test/${id}.mp3`,
    coverUrl: null,
    duration: 180,
    trackNumber: null,
    artist: { id: 'artist', name: '示例艺术家', type: 'OTHER' },
    album: null,
    category: { id: 'category', name: '梵呗' },
  };
}

function detail(item: TrackListItem): TrackDetail {
  return {
    ...item,
    lyrics: null,
    lyricsLrc: `[00:00.00]${item.title}`,
    createdAt: '',
    updatedAt: '',
  };
}

class FakeAudio implements AudioPort {
  src = '';
  currentTime = 0;
  duration = Number.NaN;
  paused = true;
  rejectPlay = false;
  private listeners = new Map<string, Set<EventListener>>();

  play = vi.fn(async () => {
    if (this.rejectPlay) throw new Error('NotAllowedError');
    this.paused = false;
    this.emit('play');
  });

  pause = vi.fn(() => {
    this.paused = true;
    this.emit('pause');
  });

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) listener(new Event(type));
  }

  listenerCount(): number {
    return [...this.listeners.values()].reduce((total, listeners) => total + listeners.size, 0);
  }
}

function setup() {
  const audio = new FakeAudio();
  const loadDetail = vi.fn(async (id: string) => detail(track(id)));
  const manager = new PlayerManager(audio, loadDetail);
  return { audio, loadDetail, manager };
}

describe('PlayerManager', () => {
  it('starts the selected track immediately and keeps a copied queue', async () => {
    const { audio, loadDetail, manager } = setup();
    const queue = [track('a'), track('b')];
    manager.playFromQueue(queue, 1);
    expect(manager.getSnapshot().currentTrack?.id).toBe('b');
    expect(manager.getSnapshot().currentIndex).toBe(1);
    expect(manager.getSnapshot().queue).not.toBe(queue);
    expect(audio.src).toBe(queue[1]?.audioUrl);
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(loadDetail).toHaveBeenCalledWith('b', expect.any(AbortSignal));
    await Promise.resolve();
    expect(manager.getSnapshot().detail?.id).toBe('b');
    manager.destroy();
  });

  it('pauses, resumes, updates time and seeks within duration', () => {
    const { audio, manager } = setup();
    manager.playFromQueue([track('a')], 0);
    expect(manager.getSnapshot().isPlaying).toBe(true);
    manager.pause();
    expect(manager.getSnapshot().isPlaying).toBe(false);
    manager.resume();
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(manager.getSnapshot().isPlaying).toBe(true);
    audio.duration = 222.4;
    audio.emit('loadedmetadata');
    expect(manager.getSnapshot().duration).toBe(222.4);
    audio.currentTime = 31;
    audio.emit('timeupdate');
    expect(manager.getSnapshot().currentTime).toBe(31);
    manager.seek(500);
    expect(audio.currentTime).toBe(222.4);
    manager.destroy();
  });

  it('moves through queue and advances on ended without looping at the end', () => {
    const { audio, manager } = setup();
    manager.playFromQueue([track('a'), track('b')], 0);
    manager.next();
    expect(manager.getSnapshot().currentTrack?.id).toBe('b');
    manager.previous();
    expect(manager.getSnapshot().currentTrack?.id).toBe('a');
    audio.emit('ended');
    expect(manager.getSnapshot().currentTrack?.id).toBe('b');
    audio.emit('ended');
    expect(manager.getSnapshot().isPlaying).toBe(false);
    expect(manager.getSnapshot().currentIndex).toBe(1);
    manager.destroy();
  });

  it('reports media errors and rejected play without losing the selected track', async () => {
    const { audio, manager } = setup();
    manager.playFromQueue([track('a')], 0);
    audio.emit('error');
    expect(manager.getSnapshot().error).toContain('音频加载失败');
    expect(manager.getSnapshot().isPlaying).toBe(false);
    audio.rejectPlay = true;
    manager.resume();
    await Promise.resolve();
    await Promise.resolve();
    expect(manager.getSnapshot().error).toContain('播放未能开始');
    expect(manager.getSnapshot().currentTrack?.id).toBe('a');
    manager.destroy();
  });

  it('ignores stale detail responses after a rapid track switch', async () => {
    const audio = new FakeAudio();
    const pending = new Map<string, (value: TrackDetail) => void>();
    const manager = new PlayerManager(
      audio,
      (id) => new Promise((resolve) => pending.set(id, resolve)),
    );
    manager.playFromQueue([track('a'), track('b')], 0);
    manager.next();
    pending.get('a')?.(detail(track('a')));
    await Promise.resolve();
    expect(manager.getSnapshot().currentTrack?.id).toBe('b');
    expect(manager.getSnapshot().detail).toBeNull();
    pending.get('b')?.(detail(track('b')));
    await Promise.resolve();
    expect(manager.getSnapshot().detail?.id).toBe('b');
    manager.destroy();
  });

  it('unsubscribes and releases audio listeners on destroy', () => {
    const { audio, manager } = setup();
    const notify = vi.fn();
    const unsubscribe = manager.subscribe(notify);
    manager.playFromQueue([track('a')], 0);
    expect(notify).toHaveBeenCalled();
    unsubscribe();
    manager.destroy();
    expect(audio.listenerCount()).toBe(0);
    expect(audio.src).toBe('');
  });
});
