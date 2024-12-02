export interface PaginatorResponse<T> {
  nodes: T[];
  current_page: number;
  page_size: number;
  has_next: boolean;
  total_pages: number;
  total_count: number;
}
