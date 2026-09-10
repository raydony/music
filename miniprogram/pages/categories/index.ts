import { getCategories } from '../../services/categories';
import { getUserErrorMessage } from '../../services/request';
import type { Category } from '../../types/category';

Page({
  data: {
    categories: [] as Category[],
    loading: true,
    errorMessage: '',
  },

  onLoad() {
    void this.loadCategories();
  },

  onPullDownRefresh() {
    void this.loadCategories(true);
  },

  async loadCategories(fromPullDown = false) {
    this.setData({ loading: !fromPullDown, errorMessage: '' });
    try {
      const categories = await getCategories();
      this.setData({ categories, loading: false });
    } catch (error) {
      this.setData({ loading: false, errorMessage: getUserErrorMessage(error) });
    } finally {
      if (fromPullDown) {
        wx.stopPullDownRefresh();
      }
    }
  },

  retry() {
    void this.loadCategories();
  },

  openCategory(event: WechatMiniprogram.BaseEvent) {
    const id = event.currentTarget.dataset.id as string;
    const name = event.currentTarget.dataset.name as string;
    wx.navigateTo({
      url: `/pages/category-tracks/index?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`,
    });
  },
});
