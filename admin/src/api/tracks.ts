import type { Track, TrackInput } from '../types/catalog';
import { apiPageRequest, apiRequest } from './client';
import type { PaginationQuery } from './types';

export const listTracks = (query: PaginationQuery) => apiPageRequest<Track>('/admin/tracks', query);

export const createTrack = (input: TrackInput) =>
  apiRequest<Track>('/admin/tracks', { method: 'POST', body: input });

export const updateTrack = (id: string, input: Partial<TrackInput>) =>
  apiRequest<Track>(`/admin/tracks/${id}`, { method: 'PATCH', body: input });

export const deleteTrack = (id: string) =>
  apiRequest<{ id: string; deleted: true }>(`/admin/tracks/${id}`, { method: 'DELETE' });
