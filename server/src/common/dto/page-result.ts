export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export class PageResult<T> {
  readonly meta: PaginationMeta;

  constructor(
    readonly items: T[],
    page: number,
    pageSize: number,
    total: number,
  ) {
    this.meta = {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }
}
