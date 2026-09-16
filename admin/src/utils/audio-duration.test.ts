import { describe, expect, it, vi } from 'vitest';
import type { MediaUploadResult } from '../api/uploads';
import { readLocalAudioDuration, uploadAudioWithDuration } from './audio-duration';

const file = { name: 'music.mp3' } as File;
const uploadResult: MediaUploadResult = {
  type: 'audio',
  key: 'audio/2026/09/test.mp3',
  url: 'https://example.com/music.mp3',
  originalName: 'music.mp3',
  size: 1024,
};

function createAudioFixture(duration: number, event: 'loadedmetadata' | 'error') {
  const audio = {
    duration,
    preload: '',
    src: '',
    onloadedmetadata: null as (() => void) | null,
    onerror: null as (() => void) | null,
    load: vi.fn(() => {
      queueMicrotask(() => audio[`on${event}`]?.());
    }),
  };
  const objectUrls = {
    createObjectURL: vi.fn(() => 'blob:music'),
    revokeObjectURL: vi.fn(),
  };
  return { audio, objectUrls };
}

describe('readLocalAudioDuration', () => {
  it('rounds loadedmetadata to integer seconds and revokes the object URL', async () => {
    const { audio, objectUrls } = createAudioFixture(221.6, 'loadedmetadata');

    const seconds = await readLocalAudioDuration(
      file,
      () => audio as unknown as HTMLAudioElement,
      objectUrls,
    );

    expect(seconds).toBe(222);
    expect(audio.preload).toBe('metadata');
    expect(objectUrls.createObjectURL).toHaveBeenCalledWith(file);
    expect(objectUrls.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:music');
  });

  it('releases the object URL when metadata cannot be read', async () => {
    const { audio, objectUrls } = createAudioFixture(Number.NaN, 'error');

    await expect(
      readLocalAudioDuration(file, () => audio as unknown as HTMLAudioElement, objectUrls),
    ).rejects.toThrow('Audio metadata is unavailable');

    expect(objectUrls.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:music');
  });
});

describe('uploadAudioWithDuration', () => {
  it('updates the existing duration after successful upload and metadata read', async () => {
    const form = { audioUrl: 'old-url', duration: 100 };
    const upload = vi.fn(async () => uploadResult);

    await uploadAudioWithDuration(file, {
      readDuration: async () => 222,
      upload,
      onUploaded: (result, duration) => {
        form.audioUrl = result.url;
        if (duration !== undefined) form.duration = duration;
      },
      onDurationUnavailable: vi.fn(),
    });

    expect(form).toEqual({ audioUrl: uploadResult.url, duration: 222 });
    expect(upload).toHaveBeenCalledOnce();
  });

  it('still uploads when metadata fails and preserves the previous duration', async () => {
    const form = { audioUrl: 'old-url', duration: 135 };
    const onDurationUnavailable = vi.fn();
    const upload = vi.fn(async () => uploadResult);

    await uploadAudioWithDuration(file, {
      readDuration: async () => {
        throw new Error('Unsupported codec');
      },
      upload,
      onUploaded: (result, duration) => {
        form.audioUrl = result.url;
        if (duration !== undefined) form.duration = duration;
      },
      onDurationUnavailable,
    });

    expect(upload).toHaveBeenCalledOnce();
    expect(onDurationUnavailable).toHaveBeenCalledOnce();
    expect(form).toEqual({ audioUrl: uploadResult.url, duration: 135 });
  });

  it('does not touch an edited track when no new audio is selected', async () => {
    const onUploaded = vi.fn();
    const upload = vi.fn(async () => uploadResult);

    const result = await uploadAudioWithDuration(undefined, {
      readDuration: vi.fn(async () => 222),
      upload,
      onUploaded,
      onDurationUnavailable: vi.fn(),
    });

    expect(result).toBeUndefined();
    expect(upload).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it('does not overwrite duration when the new audio upload fails', async () => {
    const onUploaded = vi.fn();

    await expect(
      uploadAudioWithDuration(file, {
        readDuration: async () => 222,
        upload: async () => {
          throw new Error('Upload failed');
        },
        onUploaded,
        onDurationUnavailable: vi.fn(),
      }),
    ).rejects.toThrow('Upload failed');

    expect(onUploaded).not.toHaveBeenCalled();
  });
});
