export interface LyricLine {
  time: number;
  text: string;
}

const timeTag = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

export function parseLrc(source: string | null | undefined): LyricLine[] {
  if (!source) return [];
  const lines: LyricLine[] = [];
  for (const rawLine of source.split(/\r?\n/)) {
    const tags = [...rawLine.matchAll(timeTag)];
    if (!tags.length) continue;
    const text = rawLine.replace(timeTag, '').trim();
    if (!text) continue;
    for (const tag of tags) {
      const minutes = Number(tag[1]);
      const seconds = Number(tag[2]);
      if (seconds >= 60) continue;
      const fraction = tag[3] ? Number(`0.${tag[3]}`) : 0;
      lines.push({ time: minutes * 60 + seconds + fraction, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

export function currentLyricIndex(lines: readonly LyricLine[], currentTime: number): number {
  if (!lines.length || !Number.isFinite(currentTime)) return -1;
  let low = 0;
  let high = lines.length - 1;
  let result = -1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const line = lines[middle];
    if (line && line.time <= currentTime) {
      result = middle;
      low = middle + 1;
    } else high = middle - 1;
  }
  return result;
}
