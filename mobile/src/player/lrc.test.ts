import { describe, expect, it } from 'vitest';
import { currentLyricIndex, parseLrc } from './lrc';

describe('LRC', () => {
  it('parses centiseconds, milliseconds, multiple tags and sorts lines', () => {
    expect(
      parseLrc('[00:12.50]炉香乍爇\n[00:18.005][00:20.5]法界蒙熏\n[ar:示例]\n[00:03]开篇'),
    ).toEqual([
      { time: 3, text: '开篇' },
      { time: 12.5, text: '炉香乍爇' },
      { time: 18.005, text: '法界蒙熏' },
      { time: 20.5, text: '法界蒙熏' },
    ]);
  });

  it('skips malformed timestamps and blank lines', () => {
    expect(parseLrc('[00:61.00]无效\n[00:12.00]\nhello\n[01:02.00]有效')).toEqual([
      { time: 62, text: '有效' },
    ]);
  });

  it('finds the current line at boundaries and after the last line', () => {
    const lines = parseLrc('[00:05.00]第一句\n[00:10.00]第二句');
    expect(currentLyricIndex(lines, 4.9)).toBe(-1);
    expect(currentLyricIndex(lines, 5)).toBe(0);
    expect(currentLyricIndex(lines, 9.9)).toBe(0);
    expect(currentLyricIndex(lines, 10)).toBe(1);
    expect(currentLyricIndex(lines, 100)).toBe(1);
    expect(currentLyricIndex([], 10)).toBe(-1);
  });
});
