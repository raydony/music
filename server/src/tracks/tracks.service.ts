import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../common/errors/api.exception.js';
import { PageResult } from '../common/dto/page-result.js';
import type { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { trackDetailSelect, trackListSelect } from '../common/prisma/catalog-selects.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class TracksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const where = { isPublished: true } as const;
    const [items, total] = await this.prisma.$transaction(async (transaction) => {
      const items = await transaction.track.findMany({
        where,
        select: trackListSelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const total = await transaction.track.count({ where });
      return [items, total] as const;
    });

    return new PageResult(items, query.page, query.pageSize, total);
  }

  async findOne(id: string) {
    const track = await this.prisma.track.findFirst({
      where: { id, isPublished: true },
      select: trackDetailSelect,
    });

    if (!track) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'TRACK_NOT_FOUND', 'Track not found');
    }

    return track;
  }
}
