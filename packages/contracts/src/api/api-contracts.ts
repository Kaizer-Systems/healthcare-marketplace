export type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
  meta?: Record<string, unknown>;
};

export type PaginatedResponse<T> = Omit<ApiResponse<T[]>, 'meta'> & {
  meta: { page: number; pageSize: number; total: number } & Record<
    string,
    unknown
  >;
};

export function createApiResponse<T>(
  data: T,
  success = true,
  error?: string,
  meta?: Record<string, unknown>,
): ApiResponse<T> {
  return { success, data, error, meta };
}
