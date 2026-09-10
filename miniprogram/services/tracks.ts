import type { PaginationQuery, PaginatedResult } from '../types/api';
import type { TrackDetail, TrackListItem } from '../types/track';
import { request, requestPage } from './request';

export function getTracks(query: PaginationQuery = {}): Promise<PaginatedResult<TrackListItem>> {
  return requestPage<TrackListItem>({ path: '/tracks', query });
}

export function getTrack(id: string): Promise<TrackDetail> {
  return request<TrackDetail>({ path: `/tracks/${encodeURIComponent(id)}` });
}
