import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AdminJwtPayload, AuthenticatedAdmin } from '../admin-auth.types.js';
import { ADMIN_AUTH_REQUIRED } from '../decorators/admin-protected.decorator.js';
import { ADMIN_AUTH_PUBLIC } from '../decorators/admin-public.decorator.js';

interface AdminRequest extends Request {
  admin?: AuthenticatedAdmin;
}

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(ADMIN_AUTH_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiresAdmin = this.reflector.getAllAndOverride<boolean>(ADMIN_AUTH_REQUIRED, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<AdminRequest>();
    const isAdminNamespace =
      request.path === '/api/admin' || request.path.startsWith('/api/admin/');

    if (!requiresAdmin && !isAdminNamespace) {
      return true;
    }

    const token = this.extractBearerToken(request);

    if (!token) {
      throw this.unauthorized();
    }

    let payload: AdminJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<AdminJwtPayload>(token);
    } catch {
      throw this.unauthorized();
    }

    if (typeof payload.sub !== 'string' || typeof payload.username !== 'string') {
      throw this.unauthorized();
    }

    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, isActive: true },
    });

    if (!admin?.isActive || admin.username !== payload.username) {
      throw this.unauthorized();
    }

    request.admin = { id: admin.id, username: admin.username };
    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return undefined;
    }

    const [scheme, token, extra] = authorization.trim().split(/\s+/);
    if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
      return undefined;
    }

    return token;
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
}
