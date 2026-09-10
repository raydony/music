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
import { ArtistsService } from './artists.service.js';

@ApiTags('Artists')
@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Get()
  @ApiOperation({ summary: '获取艺术家列表' })
  @ApiOkResponse({ type: PaginatedResponseDto })
  findAll(@Query() query: PaginationQueryDto) {
    return this.artistsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取艺术家、专辑及已发布曲目数量' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.artistsService.findOne(id);
  }
}
