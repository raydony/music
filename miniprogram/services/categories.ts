import type { PaginatedResult, PaginationQuery } from '../types/api';
import type { Category } from '../types/category';
import type { TrackListItem } from '../types/track';
import { request, requestPage } from './request';

export function getCategories(): Promise<Category[]> {
  return request<Category[]>({ path: '/categories' });
}

export function getCategoryTracks(
  id: string,
  query: PaginationQuery = {},
): Promise<PaginatedResult<TrackListItem>> {
  return requestPage<TrackListItem>({
    path: `/categories/${encodeURIComponent(id)}/tracks`,
    query,
  });
}
