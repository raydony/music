import type { Artist, ArtistInput } from '../types/catalog';
import { apiPageRequest, apiRequest } from './client';
import type { PaginationQuery } from './types';

export const listArtists = (query: PaginationQuery) =>
  apiPageRequest<Artist>('/admin/artists', query);

export const createArtist = (input: ArtistInput) =>
  apiRequest<Artist>('/admin/artists', { method: 'POST', body: input });

export const updateArtist = (id: string, input: Partial<ArtistInput>) =>
  apiRequest<Artist>(`/admin/artists/${id}`, { method: 'PATCH', body: input });

export const deleteArtist = (id: string) =>
  apiRequest<{ id: string; deleted: true }>(`/admin/artists/${id}`, { method: 'DELETE' });
