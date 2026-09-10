import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api.exception.js';
import { PageResult } from '../../common/dto/page-result.js';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { isPrismaError } from '../../common/prisma/prisma-error.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateArtistDto } from './dto/create-artist.dto.js';
import type { UpdateArtistDto } from './dto/update-artist.dto.js';

@Injectable()
export class AdminArtistsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const [items, total] = await this.prisma.$transaction(async (transaction) => {
      const items = await transaction.artist.findMany({
        include: { _count: { select: { albums: true, tracks: true } } },
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
      include: { albums: true, _count: { select: { tracks: true } } },
    });
    if (!artist) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'ARTIST_NOT_FOUND', 'Artist not found');
    }
    return artist;
  }

  create(dto: CreateArtistDto) {
    return this.prisma.artist.create({ data: dto });
  }

  async update(id: string, dto: UpdateArtistDto) {
    await this.require(id);
    return this.prisma.artist.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.require(id);
    try {
      await this.prisma.artist.delete({ where: { id } });
      return { id, deleted: true };
    } catch (error) {
      if (isPrismaError(error, 'P2003')) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          'ARTIST_IN_USE',
          'Artist is referenced by albums or tracks',
        );
      }
      throw error;
    }
  }

  private async require(id: string): Promise<void> {
    const artist = await this.prisma.artist.findUnique({ where: { id }, select: { id: true } });
    if (!artist) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'ARTIST_NOT_FOUND', 'Artist not found');
    }
  }
}
