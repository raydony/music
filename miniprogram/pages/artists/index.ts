import { getArtists } from '../../services/artists';
import { getUserErrorMessage } from '../../services/request';
import type { ArtistView } from '../../types/artist';
import { getArtistTypeLabel } from '../../types/artist';

const PAGE_SIZE = 20;

Page({
  data: {
    artists: [] as ArtistView[],
    page: 1,
    totalPages: 1,
    loading: true,
    loadingMore: false,
    finished: false,
    errorMessage: '',
  },

  onLoad() {
    void this.loadArtists(true);
  },

  onPullDownRefresh() {
    void this.loadArtists(true, true);
  },

  onReachBottom() {
    if (!this.data.loading && !this.data.loadingMore && !this.data.finished) {
      void this.loadArtists(false);
    }
  },

  async loadArtists(reset: boolean, fromPullDown = false) {
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
      const result = await getArtists({ page: nextPage, pageSize: PAGE_SIZE });
      const nextArtists = result.items.map((artist) => ({
        ...artist,
        typeLabel: getArtistTypeLabel(artist.type),
      }));
      this.setData({
        artists: reset ? nextArtists : [...this.data.artists, ...nextArtists],
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
    void this.loadArtists(true);
  },

  openArtist(event: WechatMiniprogram.BaseEvent) {
    const id = event.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/artist-detail/index?id=${encodeURIComponent(id)}` });
  },
});
