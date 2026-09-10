import type { PaginationQuery, PaginatedResult } from '../types/api';
import type { Artist, ArtistDetail } from '../types/artist';
import { request, requestPage } from './request';

export function getArtists(query: PaginationQuery = {}): Promise<PaginatedResult<Artist>> {
  return requestPage<Artist>({ path: '/artists', query });
}

export function getArtist(id: string): Promise<ArtistDetail> {
  return request<ArtistDetail>({ path: `/artists/${encodeURIComponent(id)}` });
}
