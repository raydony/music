import { HttpStatus, Injectable } from '@nestjs/common';
import { PageResult } from '../../common/dto/page-result.js';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { ApiException } from '../../common/errors/api.exception.js';
import { isPrismaError } from '../../common/prisma/prisma-error.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const [items, total] = await this.prisma.$transaction(async (transaction) => {
      const items = await transaction.category.findMany({
        include: { _count: { select: { tracks: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const total = await transaction.category.count();
      return [items, total] as const;
    });
    return new PageResult(items, query.page, query.pageSize, total);
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { tracks: true } } },
    });
    if (!category) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'CATEGORY_NOT_FOUND', 'Category not found');
    }
    return category;
  }

  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({ data: dto });
    } catch (error) {
      this.handleNameConflict(error);
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.require(id);
    try {
      return await this.prisma.category.update({ where: { id }, data: dto });
    } catch (error) {
      this.handleNameConflict(error);
    }
  }

  async remove(id: string) {
    await this.require(id);
    try {
      await this.prisma.category.delete({ where: { id } });
      return { id, deleted: true };
    } catch (error) {
      if (isPrismaError(error, 'P2003')) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          'CATEGORY_IN_USE',
          'Category is referenced by tracks',
        );
      }
      throw error;
    }
  }

  private async require(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({ where: { id }, select: { id: true } });
    if (!category) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'CATEGORY_NOT_FOUND', 'Category not found');
    }
  }

  private handleNameConflict(error: unknown): never {
    if (isPrismaError(error, 'P2002')) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'CATEGORY_NAME_EXISTS',
        'Category name already exists',
      );
    }
    throw error;
  }
}
