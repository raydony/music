import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { ArtistType } from '../../../generated/prisma/enums.js';
import { Trim } from '../../../common/utils/trim.decorator.js';

export class CreateArtistDto {
  @ApiProperty({ example: '五台山僧众' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ enum: ArtistType, default: ArtistType.OTHER })
  @IsOptional()
  @IsEnum(ArtistType)
  type?: ArtistType;
}
