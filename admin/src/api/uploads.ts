import { apiRequest } from './client';

export const uploadTypes = ['audio', 'cover', 'lyrics'] as const;

export type UploadType = (typeof uploadTypes)[number];

export interface MediaUploadResult {
  type: UploadType;
  key: string;
  url: string;
  originalName: string;
  size: number;
  content?: string;
}

export function uploadMedia(file: File, type: UploadType): Promise<MediaUploadResult> {
  const body = new FormData();
  body.append('type', type);
  body.append('file', file);
  return apiRequest<MediaUploadResult>('/admin/uploads', { method: 'POST', body });
}
