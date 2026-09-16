import type { ApiErrorResponse, ApiResponse, PaginatedResponse, PaginationQuery } from './types';
import { clearToken, getToken } from '../auth/storage';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const apiBaseUrl = (configuredBaseUrl || 'http://localhost:3000/api').replace(/\/$/, '');

export class ApiError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false;
  }
  const error = value.error;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

async function requestEnvelope<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = path.startsWith('/admin/') ? getToken() : null;
  const isFormData = options.body instanceof FormData;
  const requestBody: BodyInit | undefined =
    options.body === undefined
      ? undefined
      : isFormData
        ? (options.body as FormData)
        : JSON.stringify(options.body);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body !== undefined && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers,
      body: requestBody,
    });
  } catch (error) {
    console.error('API network error', error);
    throw new ApiError('NETWORK_ERROR', '无法连接服务器，请检查服务是否已启动');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('INVALID_RESPONSE', '服务器返回了无法识别的响应', response.status);
  }

  if (response.status === 401) {
    clearToken();
    if (window.location.pathname !== '/login') {
      window.location.replace('/login');
    }
  }

  if (!response.ok || isApiErrorResponse(payload)) {
    if (isApiErrorResponse(payload)) {
      throw new ApiError(payload.error.code, payload.error.message, response.status);
    }
    throw new ApiError('HTTP_ERROR', '请求失败', response.status);
  }

  return payload as T;
}

export async function apiRequest<T>(path: string, options?: RequestOptions): Promise<T> {
  const response = await requestEnvelope<ApiResponse<T>>(path, options);
  return response.data;
}

export function apiPageRequest<T>(
  path: string,
  query: PaginationQuery,
): Promise<PaginatedResponse<T>> {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  return requestEnvelope<PaginatedResponse<T>>(`${path}?${search.toString()}`);
}
