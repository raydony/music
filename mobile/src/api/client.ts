import type {
  AlbumDetail,
  AlbumListItem,
  Category,
  PageResponse,
  TrackDetail,
  TrackListItem,
} from './types';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

interface Envelope<T> {
  success: true;
  data: T;
}

interface PageEnvelope<T> extends Envelope<T[]> {
  meta: PageResponse<T>['meta'];
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('网络连接暂时不可用，请稍后重试。', { cause: error });
  }

  if (!response.ok) {
    throw new Error(response.status === 404 ? '内容暂不可用。' : '加载失败，请稍后重试。');
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error('数据暂不可用，请稍后重试。');
  }
}

function pageQuery(page: number, pageSize: number): string {
  return `?${new URLSearchParams({ page: String(page), pageSize: String(pageSize) })}`;
}

export async function listTracks(
  page = 1,
  pageSize = 20,
  signal?: AbortSignal,
): Promise<PageResponse<TrackListItem>> {
  const result = await get<PageEnvelope<TrackListItem>>(
    `/tracks${pageQuery(page, pageSize)}`,
    signal,
  );
  return { data: result.data, meta: result.meta };
}

export async function listCategories(signal?: AbortSignal): Promise<Category[]> {
  const result = await get<Envelope<Category[]>>('/categories', signal);
  return result.data;
}

export async function listAlbums(
  page = 1,
  pageSize = 12,
  signal?: AbortSignal,
): Promise<PageResponse<AlbumListItem>> {
  const result = await get<PageEnvelope<AlbumListItem>>(
    `/albums${pageQuery(page, pageSize)}`,
    signal,
  );
  return { data: result.data, meta: result.meta };
}

export async function listCategoryTracks(
  categoryId: string,
  page = 1,
  pageSize = 20,
  signal?: AbortSignal,
): Promise<PageResponse<TrackListItem>> {
  const result = await get<PageEnvelope<TrackListItem>>(
    `/categories/${encodeURIComponent(categoryId)}/tracks${pageQuery(page, pageSize)}`,
    signal,
  );
  return { data: result.data, meta: result.meta };
}

export async function getAlbum(id: string, signal?: AbortSignal): Promise<AlbumDetail> {
  const result = await get<Envelope<AlbumDetail>>(`/albums/${encodeURIComponent(id)}`, signal);
  return result.data;
}

export async function getTrack(id: string, signal?: AbortSignal): Promise<TrackDetail> {
  const result = await get<Envelope<TrackDetail>>(`/tracks/${encodeURIComponent(id)}`, signal);
  return result.data;
}
