import { playerManager } from '../../player/player-manager';
import type { PlayableTrack, PlayerState } from '../../player/player-types';
import { getTrack } from '../../services/tracks';
import { formatDuration } from '../../utils/duration';
import {
  findActiveLyricIndex,
  getLyricsLines,
  parseLrc,
  type TimedLyricLine,
} from '../../utils/lyrics';

interface DisplayLyricLine {
  key: string;
  text: string;
}

interface PlayerPageRuntime {
  unsubscribe: (() => void) | null;
  synchronizedLyrics: TimedLyricLine[];
  lyricsSignature: string;
  requestingTrackId: string;
  isSeeking: boolean;
}

const runtimeByPage = new WeakMap<object, PlayerPageRuntime>();

function getRuntime(page: object): PlayerPageRuntime {
  const existing = runtimeByPage.get(page);
  if (existing) {
    return existing;
  }
  const runtime: PlayerPageRuntime = {
    unsubscribe: null,
    synchronizedLyrics: [],
    lyricsSignature: '',
    requestingTrackId: '',
    isSeeking: false,
  };
  runtimeByPage.set(page, runtime);
  return runtime;
}

const MODE_LABELS: Record<PlayerState['playMode'], string> = {
  sequence: '顺序播放',
  'repeat-one': '单曲循环',
  shuffle: '随机播放',
};

Page({
  data: {
    currentTrack: null as PlayableTrack | null,
    status: 'idle' as PlayerState['status'],
    currentTime: 0,
    currentTimeLabel: '00:00',
    duration: 0,
    durationLabel: '00:00',
    sliderValue: 0,
    playMode: 'sequence' as PlayerState['playMode'],
    playModeLabel: MODE_LABELS.sequence,
    queuePosition: '0 / 0',
    queueVisible: false,
    lyrics: [] as DisplayLyricLine[],
    activeLyricIndex: -1,
    lyricAnchor: '',
    hasSynchronizedLyrics: false,
  },

  onLoad() {
    const runtime = getRuntime(this);
    runtime.unsubscribe = playerManager.subscribe((state) => this.syncPlayerState(state));
  },

  onUnload() {
    getRuntime(this).unsubscribe?.();
    runtimeByPage.delete(this);
  },

  syncPlayerState(state: PlayerState) {
    const runtime = getRuntime(this);
    const track = state.currentTrack;
    const duration = state.duration || track?.duration || 0;
    if (track) {
      const signature = `${track.id}\n${track.lyricsLrc ?? ''}\n${track.lyrics ?? ''}`;
      if (signature !== runtime.lyricsSignature) {
        runtime.lyricsSignature = signature;
        runtime.synchronizedLyrics = parseLrc(track.lyricsLrc);
        const lyrics = runtime.synchronizedLyrics.length
          ? runtime.synchronizedLyrics.map(({ key, text }) => ({ key, text }))
          : getLyricsLines(track.lyrics, null).map((text, index) => ({
              key: `plain-${index}`,
              text,
            }));
        this.setData({
          lyrics,
          hasSynchronizedLyrics: runtime.synchronizedLyrics.length > 0,
          activeLyricIndex: -1,
          lyricAnchor: '',
        });
      }
      void this.ensureTrackDetails(track);
    } else if (runtime.lyricsSignature) {
      runtime.lyricsSignature = '';
      runtime.synchronizedLyrics = [];
      this.setData({ lyrics: [], activeLyricIndex: -1, lyricAnchor: '' });
    }

    const activeLyricIndex = runtime.synchronizedLyrics.length
      ? findActiveLyricIndex(runtime.synchronizedLyrics, state.currentTime)
      : -1;
    const lyricChanged = activeLyricIndex !== this.data.activeLyricIndex;
    this.setData({
      currentTrack: track,
      status: state.status,
      currentTime: state.currentTime,
      currentTimeLabel: formatDuration(state.currentTime),
      duration,
      durationLabel: formatDuration(duration),
      sliderValue: runtime.isSeeking ? this.data.sliderValue : state.currentTime,
      playMode: state.playMode,
      playModeLabel: MODE_LABELS[state.playMode],
      queuePosition:
        state.currentIndex >= 0 ? `${state.currentIndex + 1} / ${state.queue.length}` : '1 / 1',
      activeLyricIndex,
      lyricAnchor:
        lyricChanged && activeLyricIndex >= 0 ? `lyric-${activeLyricIndex}` : this.data.lyricAnchor,
    });
  },

  async ensureTrackDetails(track: PlayableTrack) {
    const runtime = getRuntime(this);
    const hasCompleteDetails =
      track.lyrics !== undefined &&
      track.lyricsLrc !== undefined &&
      track.album !== undefined &&
      track.category !== undefined;
    if (hasCompleteDetails) {
      return;
    }
    if (runtime.requestingTrackId === track.id) {
      return;
    }
    runtime.requestingTrackId = track.id;
    try {
      const details = await getTrack(track.id);
      playerManager.updateCurrentTrackDetails(details);
    } catch {
      // 音频播放不依赖详情请求；失败时保留当前播放器状态。
    } finally {
      if (runtime.requestingTrackId === track.id) {
        runtime.requestingTrackId = '';
      }
    }
  },

  togglePlayback() {
    if (this.data.status === 'playing') {
      playerManager.pause();
    } else if (this.data.status === 'error') {
      playerManager.retry();
    } else {
      playerManager.resume();
    }
  },

  previous() {
    playerManager.previous();
  },

  next() {
    playerManager.next();
  },

  cyclePlayMode() {
    playerManager.cyclePlayMode();
  },

  openQueue() {
    this.setData({ queueVisible: true });
  },

  closeQueue() {
    this.setData({ queueVisible: false });
  },

  onSliderChanging(event: WechatMiniprogram.SliderChanging) {
    getRuntime(this).isSeeking = true;
    this.setData({ sliderValue: Number(event.detail.value) });
  },

  onSliderChange(event: WechatMiniprogram.SliderChange) {
    const value = Number(event.detail.value);
    getRuntime(this).isSeeking = false;
    playerManager.seek(value);
  },

  openArtist() {
    const artistId = this.data.currentTrack?.artist.id;
    if (artistId) {
      wx.navigateTo({ url: `/pages/artist-detail/index?id=${encodeURIComponent(artistId)}` });
    }
  },

  openAlbum() {
    const albumId = this.data.currentTrack?.album?.id;
    if (albumId) {
      wx.navigateTo({ url: `/pages/album-detail/index?id=${encodeURIComponent(albumId)}` });
    }
  },

  goHome() {
    wx.reLaunch({ url: '/pages/home/index' });
  },
});
