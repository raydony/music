import { playerManager } from '../../player/player-manager';
import type { PlayerState } from '../../player/player-types';
import { getUserErrorMessage } from '../../services/request';
import { getTrack } from '../../services/tracks';
import type { TrackDetail } from '../../types/track';
import { formatDuration } from '../../utils/duration';
import { getLyricsLines } from '../../utils/lyrics';
import { openPlayerPage } from '../../utils/player-navigation';

interface TrackDetailView extends TrackDetail {
  durationLabel: string;
  lyricsLines: string[];
}

const unsubscribeByPage = new WeakMap<object, () => void>();

Page({
  data: {
    trackId: '',
    track: null as TrackDetailView | null,
    loading: true,
    errorMessage: '',
    playerStatus: 'idle' as PlayerState['status'],
    isCurrentTrack: false,
    currentTimeLabel: '00:00',
    playbackDuration: 0,
    progress: 0,
  },

  onLoad(options: Record<string, string | undefined>) {
    this.setData({ trackId: options.id ?? '' });
    const unsubscribe = playerManager.subscribe((state) => this.syncPlayerState(state));
    unsubscribeByPage.set(this, unsubscribe);
    void this.loadTrack();
  },

  onUnload() {
    unsubscribeByPage.get(this)?.();
    unsubscribeByPage.delete(this);
  },

  syncPlayerState(state: PlayerState) {
    const isCurrentTrack = state.currentTrack?.id === this.data.trackId;
    this.setData({
      playerStatus: isCurrentTrack ? state.status : 'idle',
      isCurrentTrack,
      currentTimeLabel: formatDuration(isCurrentTrack ? state.currentTime : 0),
      playbackDuration: isCurrentTrack
        ? state.duration || this.data.track?.duration || 0
        : this.data.track?.duration || 0,
      progress: isCurrentTrack ? state.progress : 0,
    });
  },

  async loadTrack() {
    if (!this.data.trackId) {
      this.setData({ loading: false, errorMessage: '内容不存在或已下架' });
      return;
    }

    this.setData({ loading: true, errorMessage: '' });
    try {
      const track = await getTrack(this.data.trackId);
      wx.setNavigationBarTitle({ title: track.title });
      const view: TrackDetailView = {
        ...track,
        durationLabel: formatDuration(track.duration),
        lyricsLines: getLyricsLines(track.lyrics, track.lyricsLrc),
      };
      this.setData({ track: view, playbackDuration: track.duration, loading: false });
      playerManager.updateCurrentTrackDetails(track);
      this.syncPlayerState(playerManager.getState());
    } catch (error) {
      this.setData({ loading: false, errorMessage: getUserErrorMessage(error) });
    }
  },

  retry() {
    void this.loadTrack();
  },

  togglePlayback() {
    const track = this.data.track;
    if (!track) {
      return;
    }
    if (this.data.isCurrentTrack) {
      if (this.data.playerStatus === 'playing') {
        playerManager.pause();
      } else if (this.data.playerStatus === 'error') {
        playerManager.retry();
      } else {
        playerManager.resume();
      }
      return;
    }
    playerManager.playTrack(track);
  },

  seek(event: WechatMiniprogram.SliderChange) {
    if (!this.data.isCurrentTrack || this.data.playbackDuration <= 0) {
      return;
    }
    const value = Number(event.detail.value);
    playerManager.seek((value / 100) * this.data.playbackDuration);
  },

  openPlayer() {
    if (!this.data.isCurrentTrack) {
      return;
    }
    openPlayerPage();
  },

  openArtist() {
    const artistId = this.data.track?.artist.id;
    if (artistId) {
      wx.navigateTo({ url: `/pages/artist-detail/index?id=${encodeURIComponent(artistId)}` });
    }
  },

  openAlbum() {
    const albumId = this.data.track?.album?.id;
    if (albumId) {
      wx.navigateTo({ url: `/pages/album-detail/index?id=${encodeURIComponent(albumId)}` });
    }
  },

  openCategory() {
    const category = this.data.track?.category;
    if (category) {
      wx.navigateTo({
        url: `/pages/category-tracks/index?id=${encodeURIComponent(category.id)}&name=${encodeURIComponent(category.name)}`,
      });
    }
  },
});
