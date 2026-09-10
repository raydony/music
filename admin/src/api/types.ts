export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  timestamp?: string;
  path?: string;
}

export interface PaginationQuery {
  page: number;
  pageSize: number;
}
