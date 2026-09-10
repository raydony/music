import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../common/errors/api.exception.js';
import { PageResult } from '../common/dto/page-result.js';
import type { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { artistSummarySelect, trackListSelect } from '../common/prisma/catalog-selects.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AlbumsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const [albums, total] = await this.prisma.$transaction(async (transaction) => {
      const albums = await transaction.album.findMany({
        select: {
          id: true,
          title: true,
          coverUrl: true,
          description: true,
          publishYear: true,
          artist: { select: artistSummarySelect },
          _count: { select: { tracks: { where: { isPublished: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const total = await transaction.album.count();
      return [albums, total] as const;
    });

    const items = albums.map(({ _count, ...album }) => ({
      ...album,
      publishedTrackCount: _count.tracks,
    }));

    return new PageResult(items, query.page, query.pageSize, total);
  }

  async findOne(id: string) {
    const album = await this.prisma.album.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        coverUrl: true,
        description: true,
        publishYear: true,
        createdAt: true,
        updatedAt: true,
        artist: { select: artistSummarySelect },
        tracks: {
          where: { isPublished: true },
          select: trackListSelect,
          orderBy: [{ trackNumber: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
        },
      },
    });

    if (!album) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'ALBUM_NOT_FOUND', 'Album not found');
    }

    return album;
  }
}
