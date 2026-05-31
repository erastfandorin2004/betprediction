export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  requestId: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface SportRef {
  id: number;
  name: string;
  slug: string;
}
