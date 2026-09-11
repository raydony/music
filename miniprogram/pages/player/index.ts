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
  time?: number;
}

interface PlayerPageRuntime {
  unsubscribe: (() => void) | null;
  synchronizedLyrics: TimedLyricLine[];
  lyricsSignature: string;
  requestingTrackId: string;
  isSeeking: boolean;
  isUserBrowsingLyrics: boolean;
  lastAutoScrolledLyricIndex: number;
  lyricResumeTimer: ReturnType<typeof setTimeout> | null;
  ignoreScrollEventsUntil: number;
}

const LYRIC_RESUME_DELAY_MS = 10_000;

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
    isUserBrowsingLyrics: false,
    lastAutoScrolledLyricIndex: -1,
    lyricResumeTimer: null,
    ignoreScrollEventsUntil: 0,
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
    lyricScrollTop: 0,
    hasSynchronizedLyrics: false,
    isUserBrowsingLyrics: false,
  },

  onLoad() {
    const runtime = getRuntime(this);
    runtime.unsubscribe = playerManager.subscribe((state) => this.syncPlayerState(state));
  },

  onUnload() {
    const runtime = getRuntime(this);
    if (runtime.lyricResumeTimer !== null) {
      clearTimeout(runtime.lyricResumeTimer);
    }
    runtime.unsubscribe?.();
    runtimeByPage.delete(this);
  },

  syncPlayerState(state: PlayerState) {
    const runtime = getRuntime(this);
    const track = state.currentTrack;
    const duration = state.duration || track?.duration || 0;
    if (track) {
      const signature = `${track.id}\n${track.lyricsLrc ?? ''}\n${track.lyrics ?? ''}`;
      if (signature !== runtime.lyricsSignature) {
        this.resetLyricInteraction();
        runtime.lyricsSignature = signature;
        runtime.synchronizedLyrics = parseLrc(track.lyricsLrc);
        const lyrics = runtime.synchronizedLyrics.length
          ? runtime.synchronizedLyrics.map(({ key, text, time }) => ({ key, text, time }))
          : getLyricsLines(track.lyrics, null).map((text, index) => ({
              key: `plain-${index}`,
              text,
            }));
        this.setData({
          lyrics,
          hasSynchronizedLyrics: runtime.synchronizedLyrics.length > 0,
          activeLyricIndex: -1,
          lyricScrollTop: 0,
          isUserBrowsingLyrics: false,
        });
      }
      void this.ensureTrackDetails(track);
    } else if (runtime.lyricsSignature) {
      this.resetLyricInteraction();
      runtime.lyricsSignature = '';
      runtime.synchronizedLyrics = [];
      this.setData({
        lyrics: [],
        activeLyricIndex: -1,
        lyricScrollTop: 0,
        isUserBrowsingLyrics: false,
      });
    }

    const activeLyricIndex = runtime.synchronizedLyrics.length
      ? findActiveLyricIndex(runtime.synchronizedLyrics, state.currentTime)
      : -1;
    const lyricChanged = activeLyricIndex !== this.data.activeLyricIndex;
    const playerStatePatch = {
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
    };

    if (!lyricChanged) {
      this.setData(playerStatePatch);
      return;
    }

    this.setData({ ...playerStatePatch, activeLyricIndex }, () => {
      if (!runtime.isUserBrowsingLyrics) {
        this.scrollToActiveLyric();
      }
    });
  },

  scrollToActiveLyric(force = false) {
    const runtime = getRuntime(this);
    const activeLyricIndex = this.data.activeLyricIndex;
    if (activeLyricIndex < 0 || runtime.isUserBrowsingLyrics) {
      return;
    }
    if (!force && runtime.lastAutoScrolledLyricIndex === activeLyricIndex) {
      return;
    }

    let scrollViewRect: WechatMiniprogram.BoundingClientRectCallbackResult | null = null;
    let activeLyricRect: WechatMiniprogram.BoundingClientRectCallbackResult | null = null;
    let scrollOffset: WechatMiniprogram.ScrollOffsetCallbackResult | null = null;

    wx.createSelectorQuery()
      .select('.lyrics-view')
      .boundingClientRect((result) => {
        scrollViewRect = result;
      })
      .select(`#lyric-${activeLyricIndex}`)
      .boundingClientRect((result) => {
        activeLyricRect = result;
      })
      .select('.lyrics-view')
      .scrollOffset((result) => {
        scrollOffset = result;
      })
      .exec(() => {
        const viewRect =
          scrollViewRect as WechatMiniprogram.BoundingClientRectCallbackResult | null;
        const lyricRect =
          activeLyricRect as WechatMiniprogram.BoundingClientRectCallbackResult | null;
        const offset = scrollOffset as WechatMiniprogram.ScrollOffsetCallbackResult | null;
        if (
          !viewRect ||
          !lyricRect ||
          !offset ||
          !runtimeByPage.has(this) ||
          runtime.isUserBrowsingLyrics ||
          this.data.activeLyricIndex !== activeLyricIndex
        ) {
          return;
        }

        const centeredScrollTop =
          offset.scrollTop +
          lyricRect.top -
          viewRect.top -
          viewRect.height / 2 +
          lyricRect.height / 2;
        const maximumScrollTop = Math.max(0, offset.scrollHeight - viewRect.height);
        const lyricScrollTop =
          activeLyricIndex === 0 ? 0 : Math.min(maximumScrollTop, Math.max(0, centeredScrollTop));

        runtime.lastAutoScrolledLyricIndex = activeLyricIndex;
        runtime.ignoreScrollEventsUntil = Date.now() + 800;
        this.setData({ lyricScrollTop });
      });
  },

  clearLyricResumeTimer() {
    const runtime = getRuntime(this);
    if (runtime.lyricResumeTimer !== null) {
      clearTimeout(runtime.lyricResumeTimer);
      runtime.lyricResumeTimer = null;
    }
  },

  resetLyricInteraction() {
    const runtime = getRuntime(this);
    this.clearLyricResumeTimer();
    runtime.isUserBrowsingLyrics = false;
    runtime.lastAutoScrolledLyricIndex = -1;
    runtime.ignoreScrollEventsUntil = 0;
  },

  scheduleLyricAutoFollow() {
    const runtime = getRuntime(this);
    this.clearLyricResumeTimer();
    runtime.lyricResumeTimer = setTimeout(() => {
      runtime.lyricResumeTimer = null;
      if (!runtimeByPage.has(this)) {
        return;
      }
      runtime.isUserBrowsingLyrics = false;
      this.setData({ isUserBrowsingLyrics: false }, () => {
        this.scrollToActiveLyric(true);
      });
    }, LYRIC_RESUME_DELAY_MS);
  },

  enterLyricBrowsingMode() {
    const runtime = getRuntime(this);
    if (!runtime.synchronizedLyrics.length) {
      return;
    }
    runtime.isUserBrowsingLyrics = true;
    if (!this.data.isUserBrowsingLyrics) {
      this.setData({ isUserBrowsingLyrics: true });
    }
    this.scheduleLyricAutoFollow();
  },

  handleLyricTouchStart() {
    this.enterLyricBrowsingMode();
  },

  handleLyricTouchEnd() {
    if (getRuntime(this).isUserBrowsingLyrics) {
      this.scheduleLyricAutoFollow();
    }
  },

  handleLyricScroll() {
    const runtime = getRuntime(this);
    if (Date.now() <= runtime.ignoreScrollEventsUntil) {
      return;
    }
    if (!runtime.isUserBrowsingLyrics) {
      this.enterLyricBrowsingMode();
      return;
    }
    this.scheduleLyricAutoFollow();
  },

  handleLyricTap(event: WechatMiniprogram.TouchEvent) {
    const runtime = getRuntime(this);
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(index) || index < 0) {
      return;
    }
    const lyric = runtime.synchronizedLyrics[index];
    if (!lyric || !Number.isFinite(lyric.time)) {
      return;
    }

    this.clearLyricResumeTimer();
    runtime.isUserBrowsingLyrics = false;
    runtime.lastAutoScrolledLyricIndex = -1;
    this.setData(
      {
        activeLyricIndex: index,
        isUserBrowsingLyrics: false,
      },
      () => this.scrollToActiveLyric(true),
    );
    playerManager.seek(lyric.time);
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
