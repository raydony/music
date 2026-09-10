import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PageResult } from '../dto/page-result.js';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface PaginatedSuccessResponse<T> extends SuccessResponse<T[]> {
  meta: PageResult<T>['meta'];
}

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<unknown> | PaginatedSuccessResponse<unknown>> {
    return next.handle().pipe(
      map((value: unknown) => {
        if (value instanceof PageResult) {
          return {
            success: true as const,
            data: value.items,
            meta: value.meta,
          };
        }

        return { success: true as const, data: value };
      }),
    );
  }
}
