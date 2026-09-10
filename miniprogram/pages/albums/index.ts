import { getAlbums } from '../../services/albums';
import { getUserErrorMessage } from '../../services/request';
import type { Album } from '../../types/album';
import { formatYear } from '../../utils/date';

interface AlbumView extends Album {
  yearLabel: string;
}

const PAGE_SIZE = 20;

Page({
  data: {
    albums: [] as AlbumView[],
    page: 1,
    totalPages: 1,
    loading: true,
    loadingMore: false,
    finished: false,
    errorMessage: '',
  },

  onLoad() {
    void this.loadAlbums(true);
  },

  onPullDownRefresh() {
    void this.loadAlbums(true, true);
  },

  onReachBottom() {
    if (!this.data.loading && !this.data.loadingMore && !this.data.finished) {
      void this.loadAlbums(false);
    }
  },

  async loadAlbums(reset: boolean, fromPullDown = false) {
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
      const result = await getAlbums({ page: nextPage, pageSize: PAGE_SIZE });
      const nextAlbums = result.items.map((album) => ({
        ...album,
        yearLabel: formatYear(album.publishYear),
      }));
      this.setData({
        albums: reset ? nextAlbums : [...this.data.albums, ...nextAlbums],
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
    void this.loadAlbums(true);
  },

  openAlbum(event: WechatMiniprogram.BaseEvent) {
    const id = event.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/album-detail/index?id=${encodeURIComponent(id)}` });
  },
});
