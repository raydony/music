import { ApiError } from '../api/client';

const errorMessages: Record<string, string> = {
  ARTIST_IN_USE: '该艺术家仍有关联专辑或曲目，无法删除',
  CATEGORY_IN_USE: '该分类下仍有关联曲目，无法删除',
  CATEGORY_NAME_EXISTS: '分类名称已存在',
  ALBUM_ARTIST_MISMATCH: '所选专辑不属于当前艺术家',
  TRACK_NOT_FOUND: '曲目不存在或已被删除',
  ALBUM_NOT_FOUND: '专辑不存在或已被删除',
  ARTIST_NOT_FOUND: '艺术家不存在或已被删除',
  CATEGORY_NOT_FOUND: '分类不存在或已被删除',
  NETWORK_ERROR: '无法连接服务器，请检查服务是否已启动',
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return errorMessages[error.code] ?? error.message ?? '操作失败，请稍后重试';
  }
  console.error('Unexpected UI error', error);
  return '操作失败，请稍后重试';
}
