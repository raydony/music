import { getAlbums } from '../../services/albums';
import { getArtists } from '../../services/artists';
import { getCategories } from '../../services/categories';
import { getUserErrorMessage } from '../../services/request';
import { getTracks } from '../../services/tracks';
import type { Album } from '../../types/album';
import type { ArtistView } from '../../types/artist';
import { getArtistTypeLabel } from '../../types/artist';
import type { Category } from '../../types/category';
import type { TrackView } from '../../types/track';
import { toTrackView } from '../../utils/track';

Page({
  data: {
    loading: true,
    errorMessage: '',
    categories: [] as Category[],
    tracks: [] as TrackView[],
    albums: [] as Album[],
    artists: [] as ArtistView[],
  },

  onLoad() {
    void this.loadHome();
  },

  onPullDownRefresh() {
    void this.loadHome(true);
  },

  async loadHome(fromPullDown = false) {
    this.setData({ loading: !fromPullDown, errorMessage: '' });
    try {
      const [categories, tracksResult, albumsResult, artistsResult] = await Promise.all([
        getCategories(),
        getTracks({ page: 1, pageSize: 6 }),
        getAlbums({ page: 1, pageSize: 6 }),
        getArtists({ page: 1, pageSize: 6 }),
      ]);
      this.setData({
        categories,
        tracks: tracksResult.items.map(toTrackView),
        albums: albumsResult.items,
        artists: artistsResult.items.map((artist) => ({
          ...artist,
          typeLabel: getArtistTypeLabel(artist.type),
        })),
        loading: false,
      });
    } catch (error) {
      this.setData({ loading: false, errorMessage: getUserErrorMessage(error) });
    } finally {
      if (fromPullDown) {
        wx.stopPullDownRefresh();
      }
    }
  },

  retry() {
    void this.loadHome();
  },

  openCategory(event: WechatMiniprogram.BaseEvent) {
    const id = event.currentTarget.dataset.id as string;
    const name = event.currentTarget.dataset.name as string;
    wx.navigateTo({
      url: `/pages/category-tracks/index?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`,
    });
  },

  openAlbum(event: WechatMiniprogram.BaseEvent) {
    const id = event.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/album-detail/index?id=${encodeURIComponent(id)}` });
  },

  openArtist(event: WechatMiniprogram.BaseEvent) {
    const id = event.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/artist-detail/index?id=${encodeURIComponent(id)}` });
  },
});
