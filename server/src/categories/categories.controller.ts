import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  ErrorResponseDto,
  PaginatedResponseDto,
  SuccessResponseDto,
} from '../common/dto/api-response.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { CategoriesService } from './categories.service.js';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: '获取全部分类' })
  @ApiOkResponse({ type: SuccessResponseDto })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id/tracks')
  @ApiOperation({ summary: '分页获取分类下已发布曲目' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: PaginatedResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findTracks(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.categoriesService.findTracks(id, query);
  }
}
