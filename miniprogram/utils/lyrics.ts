export interface TimedLyricLine {
  key: string;
  time: number;
  text: string;
}

interface ParsedLyricLine extends TimedLyricLine {
  sourceIndex: number;
}

const TIME_TAG_PATTERN = /\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g;

function parseFraction(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  return Number(value) / 10 ** value.length;
}

export function parseLrc(lyricsLrc: string | null | undefined): TimedLyricLine[] {
  if (!lyricsLrc?.trim()) {
    return [];
  }

  const parsed: ParsedLyricLine[] = [];
  lyricsLrc.split(/\r?\n/).forEach((sourceLine, sourceIndex) => {
    const matches = [...sourceLine.matchAll(TIME_TAG_PATTERN)];
    const text = sourceLine.replace(TIME_TAG_PATTERN, '').trim();
    if (!text) {
      return;
    }
    matches.forEach((match, tagIndex) => {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      if (seconds >= 60) {
        return;
      }
      const time = minutes * 60 + seconds + parseFraction(match[3]);
      parsed.push({
        key: `${sourceIndex}-${tagIndex}-${time}`,
        sourceIndex,
        time,
        text,
      });
    });
  });

  return parsed
    .sort((left, right) => left.time - right.time || left.sourceIndex - right.sourceIndex)
    .map(({ key, time, text }) => ({ key, time, text }));
}

export function findActiveLyricIndex(lines: TimedLyricLine[], currentTime: number): number {
  let activeIndex = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].time > currentTime) {
      break;
    }
    activeIndex = index;
  }
  return activeIndex;
}

export function getLyricsLines(
  lyrics: string | null | undefined,
  lyricsLrc: string | null | undefined,
): string[] {
  const synchronizedLines = parseLrc(lyricsLrc);
  if (synchronizedLines.length) {
    return synchronizedLines.map((line) => line.text);
  }
  if (!lyrics?.trim()) {
    return [];
  }
  return lyrics
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
