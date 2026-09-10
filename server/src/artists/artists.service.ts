import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../common/errors/api.exception.js';
import { PageResult } from '../common/dto/page-result.js';
import type { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ArtistsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const [items, total] = await this.prisma.$transaction(async (transaction) => {
      const items = await transaction.artist.findMany({
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          description: true,
          type: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const total = await transaction.artist.count();
      return [items, total] as const;
    });

    return new PageResult(items, query.page, query.pageSize, total);
  }

  async findOne(id: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        description: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        albums: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
            description: true,
            publishYear: true,
            _count: { select: { tracks: { where: { isPublished: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { tracks: { where: { isPublished: true } } } },
      },
    });

    if (!artist) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'ARTIST_NOT_FOUND', 'Artist not found');
    }

    const { _count, albums, ...details } = artist;
    return {
      ...details,
      albums: albums.map(({ _count: albumCount, ...album }) => ({
        ...album,
        publishedTrackCount: albumCount.tracks,
      })),
      publishedTrackCount: _count.tracks,
    };
  }
}
