import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AdminJwtPayload, AuthenticatedAdmin } from './admin-auth.types.js';
import type { AdminLoginDto } from './dto/admin-login.dto.js';

const DUMMY_PASSWORD_HASH = '$2b$12$b7Ux22z1v8XioyHquD90vOvr9E5v7rfLiAr0PYRbhiR18WHeH/JpC';

export interface AdminLoginResult {
  accessToken: string;
  admin: AuthenticatedAdmin;
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: AdminLoginDto): Promise<AdminLoginResult> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { username: dto.username },
      select: { id: true, username: true, passwordHash: true, isActive: true },
    });
    const passwordMatches = await compare(dto.password, admin?.passwordHash ?? DUMMY_PASSWORD_HASH);

    if (!admin?.isActive || !passwordMatches) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: '用户名或密码错误',
      });
    }

    const payload: AdminJwtPayload = { sub: admin.id, username: admin.username };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      admin: { id: admin.id, username: admin.username },
    };
  }
}
