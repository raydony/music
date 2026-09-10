import { HttpStatus, Injectable } from '@nestjs/common';
import { PageResult } from '../../common/dto/page-result.js';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { ApiException } from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CatalogRelationsService } from '../catalog-relations.service.js';
import type { CreateAlbumDto } from './dto/create-album.dto.js';
import type { UpdateAlbumDto } from './dto/update-album.dto.js';

@Injectable()
export class AdminAlbumsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly relations: CatalogRelationsService,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const [items, total] = await this.prisma.$transaction(async (transaction) => {
      const items = await transaction.album.findMany({
        include: {
          artist: { select: { id: true, name: true, type: true } },
          _count: { select: { tracks: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const total = await transaction.album.count();
      return [items, total] as const;
    });
    return new PageResult(items, query.page, query.pageSize, total);
  }

  async findOne(id: string) {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: {
        artist: { select: { id: true, name: true, type: true } },
        tracks: { orderBy: [{ trackNumber: { sort: 'asc', nulls: 'last' } }] },
      },
    });
    if (!album) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'ALBUM_NOT_FOUND', 'Album not found');
    }
    return album;
  }

  async create(dto: CreateAlbumDto) {
    await this.relations.requireArtist(dto.artistId);
    return this.prisma.album.create({ data: dto });
  }

  async update(id: string, dto: UpdateAlbumDto) {
    await this.require(id);
    if (dto.artistId !== undefined) {
      await this.relations.requireArtist(dto.artistId);
      await this.relations.ensureAlbumArtistCanChange(id, dto.artistId);
    }
    return this.prisma.album.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.require(id);
    await this.prisma.album.delete({ where: { id } });
    return { id, deleted: true, trackAlbumLinksCleared: true };
  }

  private async require(id: string): Promise<void> {
    const album = await this.prisma.album.findUnique({ where: { id }, select: { id: true } });
    if (!album) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'ALBUM_NOT_FOUND', 'Album not found');
    }
  }
}
