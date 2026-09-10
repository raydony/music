import { HttpStatus, Injectable } from '@nestjs/common';
import { PageResult } from '../../common/dto/page-result.js';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { ApiException } from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CatalogRelationsService } from '../catalog-relations.service.js';
import type { CreateTrackDto } from './dto/create-track.dto.js';
import type { UpdateTrackDto } from './dto/update-track.dto.js';

const relations = {
  artist: { select: { id: true, name: true, type: true } },
  album: { select: { id: true, title: true } },
  category: { select: { id: true, name: true } },
} as const;

@Injectable()
export class AdminTracksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogRelations: CatalogRelationsService,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const [items, total] = await this.prisma.$transaction(async (transaction) => {
      const items = await transaction.track.findMany({
        include: relations,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const total = await transaction.track.count();
      return [items, total] as const;
    });
    return new PageResult(items, query.page, query.pageSize, total);
  }

  async findOne(id: string) {
    const track = await this.prisma.track.findUnique({ where: { id }, include: relations });
    if (!track) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'TRACK_NOT_FOUND', 'Track not found');
    }
    return track;
  }

  async create(dto: CreateTrackDto) {
    await this.catalogRelations.requireArtist(dto.artistId);
    await this.catalogRelations.requireCategory(dto.categoryId);
    if (dto.albumId) {
      await this.catalogRelations.requireAlbumArtist(dto.albumId, dto.artistId);
    }
    return this.prisma.track.create({ data: dto, include: relations });
  }

  async update(id: string, dto: UpdateTrackDto) {
    const current = await this.prisma.track.findUnique({
      where: { id },
      select: { artistId: true, albumId: true, categoryId: true },
    });
    if (!current) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'TRACK_NOT_FOUND', 'Track not found');
    }

    const artistId = dto.artistId ?? current.artistId;
    const albumId = dto.albumId === undefined ? current.albumId : dto.albumId;
    const categoryId = dto.categoryId ?? current.categoryId;

    await this.catalogRelations.requireArtist(artistId);
    await this.catalogRelations.requireCategory(categoryId);
    if (albumId) {
      await this.catalogRelations.requireAlbumArtist(albumId, artistId);
    }

    return this.prisma.track.update({ where: { id }, data: dto, include: relations });
  }

  async remove(id: string) {
    const track = await this.prisma.track.findUnique({ where: { id }, select: { id: true } });
    if (!track) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'TRACK_NOT_FOUND', 'Track not found');
    }
    await this.prisma.track.delete({ where: { id } });
    return { id, deleted: true };
  }
}
