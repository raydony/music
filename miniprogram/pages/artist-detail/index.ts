import { getArtist } from '../../services/artists';
import { getUserErrorMessage } from '../../services/request';
import type { ArtistDetail } from '../../types/artist';
import { getArtistTypeLabel } from '../../types/artist';
import { formatYear } from '../../utils/date';

interface ArtistAlbumView {
  id: string;
  title: string;
  coverUrl: string | null;
  description: string | null;
  publishYear: number | null;
  publishedTrackCount: number;
  yearLabel: string;
}

interface ArtistDetailView extends ArtistDetail {
  typeLabel: string;
  albumViews: ArtistAlbumView[];
}

Page({
  data: {
    artistId: '',
    artist: null as ArtistDetailView | null,
    loading: true,
    errorMessage: '',
  },

  onLoad(options: Record<string, string | undefined>) {
    this.setData({ artistId: options.id ?? '' });
    void this.loadArtist();
  },

  async loadArtist() {
    if (!this.data.artistId) {
      this.setData({ loading: false, errorMessage: '内容不存在或已下架' });
      return;
    }
    this.setData({ loading: true, errorMessage: '' });
    try {
      const artist = await getArtist(this.data.artistId);
      wx.setNavigationBarTitle({ title: artist.name });
      this.setData({
        artist: {
          ...artist,
          typeLabel: getArtistTypeLabel(artist.type),
          albumViews: artist.albums.map((album) => ({
            ...album,
            yearLabel: formatYear(album.publishYear),
          })),
        },
        loading: false,
      });
    } catch (error) {
      this.setData({ loading: false, errorMessage: getUserErrorMessage(error) });
    }
  },

  retry() {
    void this.loadArtist();
  },

  openAlbum(event: WechatMiniprogram.BaseEvent) {
    const id = event.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/album-detail/index?id=${encodeURIComponent(id)}` });
  },
});
