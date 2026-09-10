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
import { AlbumsService } from './albums.service.js';

@ApiTags('Albums')
@Controller('albums')
export class AlbumsController {
  constructor(private readonly albumsService: AlbumsService) {}

  @Get()
  @ApiOperation({ summary: '获取专辑列表' })
  @ApiOkResponse({ type: PaginatedResponseDto })
  findAll(@Query() query: PaginationQueryDto) {
    return this.albumsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取专辑及其已发布曲目' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.albumsService.findOne(id);
  }
}
