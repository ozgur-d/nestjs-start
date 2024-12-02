export interface PaginatorResponse<T> {
  nodes: T[];
  currentPage: number;
  pageSize: number;
  hasNext: boolean;
  totalPages: number;
  totalCount: number;
}
