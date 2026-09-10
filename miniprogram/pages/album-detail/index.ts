import { getAlbum } from '../../services/albums';
import { getUserErrorMessage } from '../../services/request';
import type { AlbumDetail } from '../../types/album';
import type { TrackView } from '../../types/track';
import { formatYear } from '../../utils/date';
import { toTrackView } from '../../utils/track';

interface AlbumDetailView extends AlbumDetail {
  yearLabel: string;
  trackViews: TrackView[];
}

Page({
  data: {
    albumId: '',
    album: null as AlbumDetailView | null,
    loading: true,
    errorMessage: '',
  },

  onLoad(options: Record<string, string | undefined>) {
    this.setData({ albumId: options.id ?? '' });
    void this.loadAlbum();
  },

  async loadAlbum() {
    if (!this.data.albumId) {
      this.setData({ loading: false, errorMessage: '内容不存在或已下架' });
      return;
    }
    this.setData({ loading: true, errorMessage: '' });
    try {
      const album = await getAlbum(this.data.albumId);
      wx.setNavigationBarTitle({ title: album.title });
      this.setData({
        album: {
          ...album,
          yearLabel: formatYear(album.publishYear),
          trackViews: album.tracks.map(toTrackView),
        },
        loading: false,
      });
    } catch (error) {
      this.setData({ loading: false, errorMessage: getUserErrorMessage(error) });
    }
  },

  retry() {
    void this.loadAlbum();
  },

  openArtist() {
    const artistId = this.data.album?.artist.id;
    if (artistId) {
      wx.navigateTo({ url: `/pages/artist-detail/index?id=${encodeURIComponent(artistId)}` });
    }
  },
});
