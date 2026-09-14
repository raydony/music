import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

interface ErrorDescriptor {
  status: number;
  code: string;
  message: string;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const error = this.describe(exception);

    if (error.status >= 500) {
      this.logger.error(
        'Unhandled request error',
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message },
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }

  private describe(exception: unknown): ErrorDescriptor {
    if (exception instanceof HttpException) {
      return this.describeHttpException(exception);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002' || exception.code === 'P2003') {
        return {
          status: HttpStatus.CONFLICT,
          code: 'DATABASE_CONFLICT',
          message: 'The request conflicts with existing data',
        };
      }

      if (exception.code === 'P2025') {
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found',
        };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    };
  }

  private describeHttpException(exception: HttpException): ErrorDescriptor {
    const status = exception.getStatus();
    const response = exception.getResponse();

    if (typeof response === 'object' && response !== null) {
      const payload = response as Record<string, unknown>;
      const code = typeof payload.code === 'string' ? payload.code : this.defaultCode(status);
      const message = this.readMessage(payload.message, exception.message);
      return { status, code, message };
    }

    return {
      status,
      code: this.defaultCode(status),
      message: typeof response === 'string' ? response : exception.message,
    };
  }

  private readMessage(message: unknown, fallback: string): string {
    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message) && typeof message[0] === 'string') {
      return message[0];
    }

    return fallback;
  }

  private defaultCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.NOT_FOUND:
        return 'RESOURCE_NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      default:
        return status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'HTTP_ERROR';
    }
  }
}
