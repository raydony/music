import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedAdmin } from '../admin-auth.types.js';

interface AdminRequest extends Request {
  admin: AuthenticatedAdmin;
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedAdmin => {
    return context.switchToHttp().getRequest<AdminRequest>().admin;
  },
);
