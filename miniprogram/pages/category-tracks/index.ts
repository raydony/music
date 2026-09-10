import { getCategories, getCategoryTracks } from '../../services/categories';
import { getUserErrorMessage } from '../../services/request';
import type { TrackView } from '../../types/track';
import { toTrackView } from '../../utils/track';

const PAGE_SIZE = 20;

Page({
  data: {
    categoryId: '',
    categoryName: '分类曲目',
    tracks: [] as TrackView[],
    page: 1,
    totalPages: 1,
    loading: true,
    loadingMore: false,
    finished: false,
    errorMessage: '',
  },

  onLoad(options: Record<string, string | undefined>) {
    const categoryId = options.id ?? '';
    const categoryName = options.name ? decodeURIComponent(options.name) : '分类曲目';
    this.setData({ categoryId, categoryName });
    wx.setNavigationBarTitle({ title: categoryName });
    void this.loadCategoryName();
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

  async loadCategoryName() {
    if (!this.data.categoryId) {
      return;
    }
    try {
      const categories = await getCategories();
      const current = categories.find((category) => category.id === this.data.categoryId);
      if (current) {
        this.setData({ categoryName: current.name });
        wx.setNavigationBarTitle({ title: current.name });
      }
    } catch {
      // 曲目请求会负责展示统一错误状态。
    }
  },

  async loadTracks(reset: boolean, fromPullDown = false) {
    if (!this.data.categoryId) {
      this.setData({ loading: false, errorMessage: '内容不存在或已下架' });
      return;
    }

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
      const result = await getCategoryTracks(this.data.categoryId, {
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
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
