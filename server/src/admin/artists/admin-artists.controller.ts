import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
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
} from '../../common/dto/api-response.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { AdminArtistsService } from './admin-artists.service.js';
import { CreateArtistDto } from './dto/create-artist.dto.js';
import { UpdateArtistDto } from './dto/update-artist.dto.js';

@ApiTags('Admin Artists')
@Controller('admin/artists')
export class AdminArtistsController {
  constructor(private readonly service: AdminArtistsService) {}

  @Get()
  @ApiOperation({ summary: '管理端分页获取艺术家' })
  @ApiOkResponse({ type: PaginatedResponseDto })
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '管理端获取艺术家详情' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建艺术家（开发接口，暂无鉴权）' })
  @ApiCreatedResponse({ type: SuccessResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  create(@Body() dto: CreateArtistDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新艺术家（开发接口，暂无鉴权）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateArtistDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除艺术家（开发接口，暂无鉴权）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.service.remove(id);
  }
}
