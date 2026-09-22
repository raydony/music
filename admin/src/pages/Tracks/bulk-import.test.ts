import { describe, expect, it, vi } from 'vitest';
import type { Track } from '../../types/catalog';
import type { MediaUploadResult } from '../../api/uploads';
import {
  applyAlbumToRows,
  applyArtistToRows,
  applyPatchToRows,
  executeBulkImport,
  selectMp3Files,
  type BulkImportRow,
  type BulkImportRowPatch,
} from './bulk-import';

const uploadResult: MediaUploadResult = {
  type: 'audio',
  key: 'audio/2026/09/id.mp3',
  url: 'https://example.com/id.mp3',
  originalName: 'music.mp3',
  size: 100,
};

function row(id: string, audioUrl?: string): BulkImportRow {
  return {
    id,
    file: { name: `${id}.mp3` } as File,
    fileName: `${id}.mp3`,
    title: id,
    artistId: 'artist-id',
    categoryId: 'category-id',
    duration: 100,
    isPublished: false,
    status: audioUrl ? 'failed' : 'pending',
    audioUrl,
  };
}

const track = { id: 'track-id' } as Track;

describe('executeBulkImport', () => {
  it('continues after one item fails and limits the whole upload/create pipeline', async () => {
    let active = 0;
    let peak = 0;
    const updates = new Map<string, BulkImportRowPatch>();
    const upload = vi.fn(async (file: File) => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
      if (file.name === 'two.mp3') throw new Error('upload failed');
      return { ...uploadResult, url: `https://example.com/${file.name}` };
    });
    const create = vi.fn(async () => track);

    await executeBulkImport([row('one'), row('two'), row('three'), row('four')], {
      upload,
      create,
      concurrency: 2,
      errorMessage: (error) => (error as Error).message,
      onUpdate: (id, patch) => updates.set(id, { ...updates.get(id), ...patch }),
    });

    expect(peak).toBeLessThanOrEqual(2);
    expect(create).toHaveBeenCalledTimes(3);
    expect(updates.get('two')).toMatchObject({ status: 'failed', error: 'upload failed' });
    expect(updates.get('one')).toMatchObject({ status: 'success' });
    expect(updates.get('three')).toMatchObject({ status: 'success' });
    expect(updates.get('four')).toMatchObject({ status: 'success' });
  });

  it('retries a create failure with the existing COS URL instead of uploading again', async () => {
    const upload = vi.fn(async () => uploadResult);
    const create = vi.fn(async () => track);
    const updates: BulkImportRowPatch[] = [];

    await executeBulkImport([row('failed', uploadResult.url)], {
      upload,
      create,
      errorMessage: () => 'failed',
      onUpdate: (_id, patch) => updates.push(patch),
    });

    expect(upload).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ audioUrl: uploadResult.url }));
    expect(updates.at(-1)).toMatchObject({ status: 'success' });
  });
});

describe('selectMp3Files', () => {
  it('accepts multiple MP3 files and rejects non-MP3 files', () => {
    const selection = selectMp3Files(
      [
        { name: 'one.mp3', size: 10 } as File,
        { name: 'two.MP3', size: 20 } as File,
        { name: 'malware.exe', size: 20 } as File,
      ],
      0,
    );

    expect(selection.accepted.map((file) => file.name)).toEqual(['one.mp3', 'two.MP3']);
    expect(selection.invalidTypeCount).toBe(1);
  });

  it('enforces the maximum batch size', () => {
    const files = Array.from(
      { length: 4 },
      (_, index) => ({ name: `${index}.mp3`, size: 10 }) as File,
    );
    const selection = selectMp3Files(files, 48);

    expect(selection.accepted).toHaveLength(2);
    expect(selection.overflowCount).toBe(2);
  });
});

describe('bulk relation updates', () => {
  const albums = [
    { id: 'album-a', artist: { id: 'artist-a' } },
    { id: 'album-b', artist: { id: 'artist-b' } },
  ] as never[];

  it('sets an artist on editable rows and clears incompatible albums', () => {
    const rows = [
      { ...row('one'), artistId: 'artist-a', albumId: 'album-a' },
      { ...row('two'), artistId: 'artist-b', albumId: 'album-b' },
    ];

    const updated = applyArtistToRows(rows, 'artist-a', albums);

    expect(updated.map(({ artistId, albumId }) => ({ artistId, albumId }))).toEqual([
      { artistId: 'artist-a', albumId: 'album-a' },
      { artistId: 'artist-a', albumId: undefined },
    ]);
  });

  it('sets album and its artist together', () => {
    const [updated] = applyAlbumToRows([row('one')], 'album-b', albums);
    expect(updated).toMatchObject({ artistId: 'artist-b', albumId: 'album-b' });
  });

  it('sets category and publish status in bulk without changing successful rows', () => {
    const completed = { ...row('done'), status: 'success' as const };
    const updated = applyPatchToRows([row('one'), completed], {
      categoryId: 'category-a',
      isPublished: true,
    });

    expect(updated[0]).toMatchObject({ categoryId: 'category-a', isPublished: true });
    expect(updated[1]).toEqual(completed);
  });
});
