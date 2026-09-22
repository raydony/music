import { readLocalAudioDuration } from './audio-duration';
import { titleFromMp3FileName } from './track-file-name';

export interface AudioMetadata {
  title: string;
  artist?: string;
  album?: string;
  duration: number;
  durationUnavailable: boolean;
  tagsUnavailable: boolean;
}

export interface AudioTagValues {
  title?: string;
  artist?: string;
  album?: string;
}

interface AudioMetadataDependencies {
  readDuration?: (file: File) => Promise<number>;
  readTags?: (file: File) => Promise<AudioTagValues>;
}

function cleanTag(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

export async function readMp3Tags(file: File): Promise<AudioTagValues> {
  const { parseBlob } = await import('music-metadata');
  const metadata = await parseBlob(file, { duration: false, skipCovers: true });
  return {
    title: cleanTag(metadata.common.title),
    artist: cleanTag(metadata.common.artist),
    album: cleanTag(metadata.common.album),
  };
}

export async function inspectMp3File(
  file: File,
  dependencies: AudioMetadataDependencies = {},
): Promise<AudioMetadata> {
  const [durationResult, tagsResult] = await Promise.allSettled([
    (dependencies.readDuration ?? readLocalAudioDuration)(file),
    (dependencies.readTags ?? readMp3Tags)(file),
  ]);
  const tags = tagsResult.status === 'fulfilled' ? tagsResult.value : {};

  return {
    title: cleanTag(tags.title) ?? titleFromMp3FileName(file.name),
    artist: cleanTag(tags.artist),
    album: cleanTag(tags.album),
    duration: durationResult.status === 'fulfilled' ? durationResult.value : 0,
    durationUnavailable: durationResult.status === 'rejected',
    tagsUnavailable: tagsResult.status === 'rejected',
  };
}
