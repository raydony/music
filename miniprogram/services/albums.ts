import type { Album, AlbumDetail } from '../types/album';
import type { PaginationQuery, PaginatedResult } from '../types/api';
import { request, requestPage } from './request';

export function getAlbums(query: PaginationQuery = {}): Promise<PaginatedResult<Album>> {
  return requestPage<Album>({ path: '/albums', query });
}

export function getAlbum(id: string): Promise<AlbumDetail> {
  return request<AlbumDetail>({ path: `/albums/${encodeURIComponent(id)}` });
}
