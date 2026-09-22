import { describe, expect, it } from 'vitest';
import {
  findDuplicateValues,
  normalizeDuplicateValue,
  titleFromMp3FileName,
} from './track-file-name';

describe('titleFromMp3FileName', () => {
  it.each([
    ['01 炉香赞.mp3', '炉香赞'],
    ['01. 炉香赞.mp3', '炉香赞'],
    ['01-炉香赞.mp3', '炉香赞'],
    ['01 - 炉香赞.mp3', '炉香赞'],
    ['001_炉香赞.MP3', '炉香赞'],
    ['炉香赞.mp3', '炉香赞'],
  ])('converts %s to %s', (fileName, expected) => {
    expect(titleFromMp3FileName(fileName)).toBe(expected);
  });
});

describe('findDuplicateValues', () => {
  it('finds duplicate values after trimming, whitespace folding and case normalization', () => {
    const duplicates = findDuplicateValues(
      [{ name: ' Track  One ' }, { name: 'track one' }, { name: 'Track Two' }],
      (item) => item.name,
    );

    expect(duplicates).toEqual(new Set([normalizeDuplicateValue('Track One')]));
  });
});
