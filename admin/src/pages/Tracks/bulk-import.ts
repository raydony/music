import type { Album, Track, TrackInput } from '../../types/catalog';
import type { MediaUploadResult } from '../../api/uploads';
import { runWithConcurrency } from '../../utils/concurrency';

export const BULK_IMPORT_LIMIT = 50;
export const BULK_IMPORT_CONCURRENCY = 3;
export const BULK_IMPORT_MAX_AUDIO_SIZE = 100 * 1024 * 1024;

export type BulkImportStatus =
  'reading' | 'pending' | 'uploading' | 'creating' | 'success' | 'failed';

export interface BulkImportRow {
  id: string;
  file: File;
  fileName: string;
  title: string;
  metadataArtist?: string;
  metadataAlbum?: string;
  artistId?: string;
  albumId?: string;
  categoryId?: string;
  duration: number;
  isPublished: boolean;
  status: BulkImportStatus;
  durationUnavailable?: boolean;
  tagsUnavailable?: boolean;
  audioUrl?: string;
  trackId?: string;
  error?: string;
}

export type BulkImportRowPatch = Partial<Omit<BulkImportRow, 'id' | 'file'>>;

export interface Mp3FileSelection {
  accepted: File[];
  invalidTypeCount: number;
  invalidSizeCount: number;
  overflowCount: number;
}

export function selectMp3Files(files: readonly File[], currentCount: number): Mp3FileSelection {
  const mp3Files = files.filter((file) => /\.mp3$/i.test(file.name));
  const correctlySized = mp3Files.filter(
    (file) => file.size > 0 && file.size <= BULK_IMPORT_MAX_AUDIO_SIZE,
  );
  const available = Math.max(0, BULK_IMPORT_LIMIT - currentCount);

  return {
    accepted: correctlySized.slice(0, available),
    invalidTypeCount: files.length - mp3Files.length,
    invalidSizeCount: mp3Files.length - correctlySized.length,
    overflowCount: Math.max(0, correctlySized.length - available),
  };
}

interface BulkImportDependencies {
  upload: (file: File) => Promise<MediaUploadResult>;
  create: (input: TrackInput) => Promise<Track>;
  onUpdate: (id: string, patch: BulkImportRowPatch) => void;
  errorMessage: (error: unknown) => string;
  concurrency?: number;
}

function createInput(row: BulkImportRow, audioUrl: string): TrackInput {
  return {
    title: row.title.trim(),
    artistId: row.artistId!,
    albumId: row.albumId ?? null,
    categoryId: row.categoryId!,
    audioUrl,
    duration: row.duration,
    isPublished: row.isPublished,
  };
}

export async function executeBulkImport(
  rows: readonly BulkImportRow[],
  dependencies: BulkImportDependencies,
): Promise<void> {
  await runWithConcurrency(
    rows,
    dependencies.concurrency ?? BULK_IMPORT_CONCURRENCY,
    async (row) => {
      let audioUrl = row.audioUrl;
      try {
        if (!audioUrl) {
          dependencies.onUpdate(row.id, { status: 'uploading', error: undefined });
          const upload = await dependencies.upload(row.file);
          audioUrl = upload.url;
        }

        dependencies.onUpdate(row.id, { status: 'creating', audioUrl, error: undefined });
        const track = await dependencies.create(createInput(row, audioUrl));
        dependencies.onUpdate(row.id, {
          status: 'success',
          audioUrl,
          trackId: track.id,
          error: undefined,
        });
      } catch (error) {
        dependencies.onUpdate(row.id, {
          status: 'failed',
          ...(audioUrl ? { audioUrl } : {}),
          error: dependencies.errorMessage(error),
        });
      }
    },
  );
}

export function validateBulkImportRow(row: BulkImportRow): string[] {
  const errors: string[] = [];
  if (!row.title.trim()) errors.push('缺少曲名');
  if (!row.artistId) errors.push('未选择艺术家');
  if (!row.categoryId) errors.push('未选择分类');
  if (!Number.isInteger(row.duration) || row.duration < 0) errors.push('时长必须是非负整数');
  return errors;
}

function canEdit(row: BulkImportRow): boolean {
  return row.status === 'pending' || row.status === 'failed';
}

export function applyArtistToRows(
  rows: readonly BulkImportRow[],
  artistId: string,
  albums: readonly Album[],
): BulkImportRow[] {
  return rows.map((row) => {
    if (!canEdit(row)) return row;
    const albumStillMatches =
      row.albumId &&
      albums.some((album) => album.id === row.albumId && album.artist.id === artistId);
    return { ...row, artistId, albumId: albumStillMatches ? row.albumId : undefined };
  });
}

export function applyAlbumToRows(
  rows: readonly BulkImportRow[],
  albumId: string | undefined,
  albums: readonly Album[],
): BulkImportRow[] {
  const album = albums.find((item) => item.id === albumId);
  return rows.map((row) =>
    canEdit(row)
      ? {
          ...row,
          albumId,
          ...(album ? { artistId: album.artist.id } : {}),
        }
      : row,
  );
}

export function applyPatchToRows(
  rows: readonly BulkImportRow[],
  patch: Pick<BulkImportRowPatch, 'categoryId' | 'isPublished'>,
): BulkImportRow[] {
  return rows.map((row) => (canEdit(row) ? { ...row, ...patch } : row));
}
