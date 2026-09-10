import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../common/errors/api.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CatalogRelationsService {
  constructor(private readonly prisma: PrismaService) {}

  async requireArtist(id: string): Promise<void> {
    const artist = await this.prisma.artist.findUnique({ where: { id }, select: { id: true } });
    if (!artist) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'ARTIST_NOT_FOUND', 'Artist not found');
    }
  }

  async requireCategory(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({ where: { id }, select: { id: true } });
    if (!category) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'CATEGORY_NOT_FOUND', 'Category not found');
    }
  }

  async requireAlbumArtist(albumId: string, artistId: string): Promise<void> {
    const album = await this.prisma.album.findUnique({
      where: { id: albumId },
      select: { artistId: true },
    });

    if (!album) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'ALBUM_NOT_FOUND', 'Album not found');
    }

    if (album.artistId !== artistId) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'ALBUM_ARTIST_MISMATCH',
        'Album does not belong to the selected artist',
      );
    }
  }

  async ensureAlbumArtistCanChange(albumId: string, artistId: string): Promise<void> {
    const mismatchedTrack = await this.prisma.track.findFirst({
      where: { albumId, artistId: { not: artistId } },
      select: { id: true },
    });

    if (mismatchedTrack) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'ALBUM_ARTIST_MISMATCH',
        'Album artist conflicts with an existing track artist',
      );
    }
  }
}
