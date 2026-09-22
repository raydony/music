const LEADING_TRACK_NUMBER = /^\s*\d{1,4}(?:\s*[._-]\s*|\s+)/;

export function titleFromMp3FileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.mp3$/i, '').trim();
  const withoutTrackNumber = withoutExtension.replace(LEADING_TRACK_NUMBER, '').trim();
  return withoutTrackNumber || withoutExtension || '未命名曲目';
}

export function normalizeDuplicateValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function findDuplicateValues<T>(
  items: readonly T[],
  getValue: (item: T) => string,
): Set<string> {
  const counts = new Map<string, number>();

  for (const item of items) {
    const normalized = normalizeDuplicateValue(getValue(item));
    if (normalized) counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value));
}
