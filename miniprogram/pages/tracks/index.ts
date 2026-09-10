import { getUserErrorMessage } from '../../services/request';
import { getTracks } from '../../services/tracks';
import type { TrackView } from '../../types/track';
import { toTrackView } from '../../utils/track';

const PAGE_SIZE = 20;

Page({
  data: {
    tracks: [] as TrackView[],
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 1,
    loading: true,
    loadingMore: false,
    finished: false,
    errorMessage: '',
  },

  onLoad() {
    void this.loadTracks(true);
  },

  onPullDownRefresh() {
    void this.loadTracks(true, true);
  },

  onReachBottom() {
    if (!this.data.loading && !this.data.loadingMore && !this.data.finished) {
      void this.loadTracks(false);
    }
  },

  async loadTracks(reset: boolean, fromPullDown = false) {
    if (reset) {
      this.setData({
        page: 1,
        loading: !fromPullDown,
        loadingMore: false,
        finished: false,
        errorMessage: '',
      });
    } else {
      this.setData({ loadingMore: true });
    }

    const nextPage = reset ? 1 : this.data.page + 1;
    try {
      const result = await getTracks({ page: nextPage, pageSize: this.data.pageSize });
      const nextTracks = result.items.map(toTrackView);
      this.setData({
        tracks: reset ? nextTracks : [...this.data.tracks, ...nextTracks],
        page: result.meta.page,
        totalPages: result.meta.totalPages,
        finished: result.meta.page >= result.meta.totalPages,
        loading: false,
        loadingMore: false,
      });
    } catch (error) {
      const errorMessage = getUserErrorMessage(error);
      this.setData({ loading: false, loadingMore: false, errorMessage });
      if (!reset) {
        wx.showToast({ title: errorMessage, icon: 'none' });
      }
    } finally {
      if (fromPullDown) {
        wx.stopPullDownRefresh();
      }
    }
  },

  retry() {
    void this.loadTracks(true);
  },
});
