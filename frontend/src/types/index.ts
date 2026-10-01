/** Shared, app-wide types. Feature-specific types live inside each feature folder. */

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type Theme = "light" | "dark" | "system";
