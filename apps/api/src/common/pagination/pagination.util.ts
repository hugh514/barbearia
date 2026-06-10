import {
  PaginatedResult,
  PaginationMeta,
} from '@common/pagination/pagination.types';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PER_PAGE = 20;
export const MAX_PER_PAGE = 100;

export function buildPaginationMeta(
  total: number,
  page: number,
  perPage: number,
): PaginationMeta {
  const lastPage = total === 0 ? 1 : Math.ceil(total / perPage);

  return {
    total,
    page,
    perPage,
    lastPage,
  };
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  perPage: number,
): PaginatedResult<T> {
  return {
    data,
    meta: buildPaginationMeta(total, page, perPage),
  };
}

export function getPaginationSkip(page: number, perPage: number): number {
  return (page - 1) * perPage;
}
