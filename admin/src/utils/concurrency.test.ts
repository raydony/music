import { describe, expect, it } from 'vitest';
import { runWithConcurrency } from './concurrency';

describe('runWithConcurrency', () => {
  it('never exceeds the configured concurrency and isolates failures', async () => {
    let active = 0;
    let peak = 0;

    const results = await runWithConcurrency([1, 2, 3, 4, 5], 3, async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
      if (value === 3) throw new Error('single failure');
      return value * 2;
    });

    expect(peak).toBe(3);
    expect(results.map((result) => result.status)).toEqual([
      'fulfilled',
      'fulfilled',
      'rejected',
      'fulfilled',
      'fulfilled',
    ]);
  });
});
