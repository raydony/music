import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class SuccessResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: Object })
  data: object;
}

export class PaginatedResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  data: object[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class ErrorBodyDto {
  @ApiProperty({ example: 'TRACK_NOT_FOUND' })
  code: string;

  @ApiProperty({ example: 'Track not found' })
  message: string;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: false;

  @ApiProperty({ type: ErrorBodyDto })
  error: ErrorBodyDto;

  @ApiProperty({ example: '2026-09-09T10:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/tracks/invalid-id' })
  path: string;
}
