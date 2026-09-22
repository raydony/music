import { describe, expect, it } from 'vitest';
import { inspectMp3File } from './audio-metadata';

const file = { name: '01 - 炉香赞.mp3' } as File;

describe('inspectMp3File', () => {
  it('reads duration and ID3 values when available', async () => {
    const result = await inspectMp3File(file, {
      readDuration: async () => 222,
      readTags: async () => ({ title: '炉香赞', artist: '五台山僧众', album: '梵音' }),
    });

    expect(result).toEqual({
      title: '炉香赞',
      artist: '五台山僧众',
      album: '梵音',
      duration: 222,
      durationUnavailable: false,
      tagsUnavailable: false,
    });
  });

  it('falls back to the normalized file name when ID3 metadata is absent', async () => {
    const result = await inspectMp3File(file, {
      readDuration: async () => 181,
      readTags: async () => ({}),
    });

    expect(result.title).toBe('炉香赞');
    expect(result.duration).toBe(181);
    expect(result.tagsUnavailable).toBe(false);
  });

  it('keeps the file importable when duration and ID3 parsing fail', async () => {
    const result = await inspectMp3File(file, {
      readDuration: async () => Promise.reject(new Error('duration failed')),
      readTags: async () => Promise.reject(new Error('tags failed')),
    });

    expect(result).toMatchObject({
      title: '炉香赞',
      duration: 0,
      durationUnavailable: true,
      tagsUnavailable: true,
    });
  });
});
