export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string | string[];
  };
  timestamp?: string;
  path?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface PaginationQuery {
  [key: string]: string | number | boolean | null | undefined;
  page?: number;
  pageSize?: number;
}
