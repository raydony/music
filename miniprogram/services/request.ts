import { API_BASE_URL } from '../config/env';
import type {
  ApiErrorResponse,
  ApiResponse,
  PaginatedResponse,
  PaginatedResult,
} from '../types/api';

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: WechatMiniprogram.IAnyObject;
  query?: Record<string, QueryValue>;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!query) {
    return `${API_BASE_URL}${normalizedPath}`;
  }

  const queryString = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return `${API_BASE_URL}${normalizedPath}${queryString ? `?${queryString}` : ''}`;
}

function isErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    value.success === false &&
    'error' in value
  );
}

function getErrorMessage(error: ApiErrorResponse['error']): string {
  return Array.isArray(error.message) ? error.message.join('；') : error.message;
}

function requestEnvelope<T extends WechatMiniprogram.IAnyObject>(
  options: RequestOptions,
): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request<T | ApiErrorResponse>({
      url: buildUrl(options.path, options.query),
      method: options.method ?? 'GET',
      data: options.data,
      timeout: 10000,
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          const body = response.data;
          if (isErrorResponse(body)) {
            reject(new ApiError(body.error.code, getErrorMessage(body.error), response.statusCode));
            return;
          }
          resolve(body as T);
          return;
        }

        if (isErrorResponse(response.data)) {
          reject(
            new ApiError(
              response.data.error.code,
              getErrorMessage(response.data.error),
              response.statusCode,
            ),
          );
          return;
        }

        reject(new ApiError('HTTP_ERROR', '加载失败，请稍后重试', response.statusCode));
      },
      fail() {
        reject(new ApiError('NETWORK_ERROR', '加载失败，请稍后重试'));
      },
    });
  });
}

export async function request<T>(options: RequestOptions): Promise<T> {
  const response = await requestEnvelope<ApiResponse<T>>(options);
  return response.data;
}

export async function requestPage<T>(options: RequestOptions): Promise<PaginatedResult<T>> {
  const response = await requestEnvelope<PaginatedResponse<T>>(options);
  return { items: response.data, meta: response.meta };
}

export function getUserErrorMessage(error: unknown): string {
  if (
    error instanceof ApiError &&
    (error.statusCode === 404 || error.code.endsWith('_NOT_FOUND'))
  ) {
    return '内容不存在或已下架';
  }
  return '加载失败，请稍后重试';
}
