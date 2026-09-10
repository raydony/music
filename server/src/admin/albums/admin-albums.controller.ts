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
import { AdminAlbumsService } from './admin-albums.service.js';
import { CreateAlbumDto } from './dto/create-album.dto.js';
import { UpdateAlbumDto } from './dto/update-album.dto.js';

@ApiTags('Admin Albums')
@Controller('admin/albums')
export class AdminAlbumsController {
  constructor(private readonly service: AdminAlbumsService) {}

  @Get()
  @ApiOperation({ summary: '管理端分页获取专辑' })
  @ApiOkResponse({ type: PaginatedResponseDto })
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '管理端获取专辑详情' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建专辑（开发接口，暂无鉴权）' })
  @ApiCreatedResponse({ type: SuccessResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  create(@Body() dto: CreateAlbumDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新专辑（开发接口，暂无鉴权）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateAlbumDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除专辑并清空曲目关联（开发接口，暂无鉴权）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.service.remove(id);
  }
}
