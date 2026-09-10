import type { Album, AlbumInput } from '../types/catalog';
import { apiPageRequest, apiRequest } from './client';
import type { PaginationQuery } from './types';

export const listAlbums = (query: PaginationQuery) => apiPageRequest<Album>('/admin/albums', query);

export const createAlbum = (input: AlbumInput) =>
  apiRequest<Album>('/admin/albums', { method: 'POST', body: input });

export const updateAlbum = (id: string, input: Partial<AlbumInput>) =>
  apiRequest<Album>(`/admin/albums/${id}`, { method: 'PATCH', body: input });

export const deleteAlbum = (id: string) =>
  apiRequest<{ id: string; deleted: true; trackAlbumLinksCleared: true }>(`/admin/albums/${id}`, {
    method: 'DELETE',
  });
