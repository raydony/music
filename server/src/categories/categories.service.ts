import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../common/errors/api.exception.js';
import { PageResult } from '../common/dto/page-result.js';
import type { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { trackListSelect } from '../common/prisma/catalog-selects.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const categories = await this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { tracks: { where: { isPublished: true } } } },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map(({ _count, ...category }) => ({
      ...category,
      publishedTrackCount: _count.tracks,
    }));
  }

  async findTracks(id: string, query: PaginationQueryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!category) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    const where = { categoryId: id, isPublished: true } as const;
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
}
