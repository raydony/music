import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../../common/utils/trim.decorator.js';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin', maxLength: 64 })
  @IsString()
  @Trim()
  @MinLength(1)
  @MaxLength(64)
  username: string;

  @ApiProperty({ format: 'password', minLength: 8, maxLength: 128, writeOnly: true })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
