import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminProtected } from '../admin-auth/decorators/admin-protected.decorator.js';
import { ErrorResponseDto } from '../common/dto/api-response.dto.js';
import { AdminUploadService } from './admin-upload.service.js';
import { AdminUploadSuccessResponseDto } from './dto/admin-upload-response.dto.js';
import { adminUploadMulterOptions } from './upload-options.js';

@ApiTags('Admin Uploads')
@AdminProtected()
@Controller('admin/uploads')
export class AdminUploadController {
  constructor(private readonly uploadService: AdminUploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', adminUploadMulterOptions))
  @ApiOperation({ summary: '上传曲目音频、封面或歌词文件到腾讯云 COS' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', enum: ['audio', 'cover', 'lyrics'] },
      },
    },
  })
  @ApiCreatedResponse({ type: AdminUploadSuccessResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiPayloadTooLargeResponse({ type: ErrorResponseDto })
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('type') type: string | undefined,
  ) {
    return this.uploadService.upload(file, type);
  }
}
