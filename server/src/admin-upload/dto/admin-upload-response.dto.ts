import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ADMIN_UPLOAD_TYPES, type AdminUploadType } from '../admin-upload.types.js';

export class AdminUploadResponseDto {
  @ApiProperty({ enum: ADMIN_UPLOAD_TYPES })
  type: AdminUploadType;

  @ApiProperty({ example: 'audio/2026/09/f81d4fae-7dec-11d0-a765-00a0c91e6bf6.mp3' })
  key: string;

  @ApiProperty({ example: 'https://example.cos.ap-beijing.myqcloud.com/audio/example.mp3' })
  url: string;

  @ApiProperty({ example: '炉香赞.mp3' })
  originalName: string;

  @ApiProperty({ example: 12345678 })
  size: number;

  @ApiPropertyOptional({ example: '[00:00.00]炉香乍爇' })
  content?: string;
}

export class AdminUploadSuccessResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: AdminUploadResponseDto })
  data: AdminUploadResponseDto;
}
