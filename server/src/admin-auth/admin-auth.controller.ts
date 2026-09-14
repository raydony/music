import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ErrorResponseDto, SuccessResponseDto } from '../common/dto/api-response.dto.js';
import type { AuthenticatedAdmin } from './admin-auth.types.js';
import { AdminAuthService } from './admin-auth.service.js';
import { AdminProtected } from './decorators/admin-protected.decorator.js';
import { AdminPublic } from './decorators/admin-public.decorator.js';
import { CurrentAdmin } from './decorators/current-admin.decorator.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly authService: AdminAuthService) {}

  @Post('login')
  @AdminPublic()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '管理员登录' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  login(@Body() dto: AdminLoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @AdminProtected()
  @ApiOperation({ summary: '获取当前管理员' })
  @ApiOkResponse({ type: SuccessResponseDto })
  me(@CurrentAdmin() admin: AuthenticatedAdmin): AuthenticatedAdmin {
    return admin;
  }
}
