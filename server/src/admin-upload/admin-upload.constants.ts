export const MEBIBYTE = 1024 * 1024;
export const MAX_UPLOAD_SIZE = 100 * MEBIBYTE;
export const UPLOAD_TEMP_PREFIX = 'buddhist-music-upload-';

export const UPLOAD_LIMITS = {
  audio: 100 * MEBIBYTE,
  cover: 10 * MEBIBYTE,
  lyrics: MEBIBYTE,
} as const;
