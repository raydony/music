import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../../common/utils/trim.decorator.js';

export class CreateTrackDto {
  @ApiProperty({ example: '炉香赞（测试）' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  subtitle?: string | null;

  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID('4')
  artistId: string;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  albumId?: string | null;

  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID('4')
  categoryId: string;

  @ApiProperty({ example: 'https://example.com/audio/test.mp3' })
  @IsUrl({ require_protocol: true })
  audioUrl: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'https://example.com/cover.jpg' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  coverUrl?: string | null;

  @ApiProperty({ type: Number, minimum: 0, description: '音频时长，单位为秒' })
  @IsInt()
  @Min(0)
  duration: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  lyrics?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  lyricsLrc?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  trackNumber?: number | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
