import type { Category, CategoryInput } from '../types/catalog';
import { apiPageRequest, apiRequest } from './client';
import type { PaginationQuery } from './types';

export const listCategories = (query: PaginationQuery) =>
  apiPageRequest<Category>('/admin/categories', query);

export const createCategory = (input: CategoryInput) =>
  apiRequest<Category>('/admin/categories', { method: 'POST', body: input });

export const updateCategory = (id: string, input: Partial<CategoryInput>) =>
  apiRequest<Category>(`/admin/categories/${id}`, { method: 'PATCH', body: input });

export const deleteCategory = (id: string) =>
  apiRequest<{ id: string; deleted: true }>(`/admin/categories/${id}`, { method: 'DELETE' });
