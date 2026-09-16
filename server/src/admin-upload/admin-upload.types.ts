export const ADMIN_UPLOAD_TYPES = ['audio', 'cover', 'lyrics'] as const;

export type AdminUploadType = (typeof ADMIN_UPLOAD_TYPES)[number];

export interface CosUploadInput {
  key: string;
  filePath: string;
  contentType: string;
}

export interface CosUploadResult {
  url: string;
}

export interface AdminUploadResult {
  type: AdminUploadType;
  key: string;
  url: string;
  originalName: string;
  size: number;
  content?: string;
}
