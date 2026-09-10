import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../../common/utils/trim.decorator.js';

export class CreateAlbumDto {
  @ApiProperty({ example: '五台山佛教音乐示例集' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'https://example.com/cover.jpg' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  coverUrl?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID('4')
  artistId: string;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 1000,
    maximum: new Date().getFullYear() + 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(new Date().getFullYear() + 1)
  publishYear?: number | null;
}
