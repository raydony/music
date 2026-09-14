import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/api-response.dto.js';

export const ADMIN_AUTH_REQUIRED = 'adminAuthRequired';

export function AdminProtected() {
  return applyDecorators(
    SetMetadata(ADMIN_AUTH_REQUIRED, true),
    ApiBearerAuth('admin-jwt'),
    ApiUnauthorizedResponse({ type: ErrorResponseDto }),
  );
}
