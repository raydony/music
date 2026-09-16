import type { MediaUploadResult } from '../api/uploads';

const METADATA_TIMEOUT_MS = 10_000;

export function readLocalAudioDuration(
  file: File,
  createAudio: () => HTMLAudioElement = () => new Audio(),
  objectUrls: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'> = URL,
): Promise<number> {
  return new Promise((resolve, reject) => {
    let audio: HTMLAudioElement;
    try {
      audio = createAudio();
    } catch (error) {
      reject(error);
      return;
    }

    let objectUrl: string;
    try {
      objectUrl = objectUrls.createObjectURL(file);
    } catch (error) {
      reject(error);
      return;
    }

    let settled = false;
    const finish = (duration?: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      audio.onloadedmetadata = null;
      audio.onerror = null;
      objectUrls.revokeObjectURL(objectUrl);

      if (duration === undefined) {
        reject(new Error('Audio metadata is unavailable'));
      } else {
        resolve(duration);
      }
    };

    audio.onloadedmetadata = () => {
      const seconds = audio.duration;
      finish(Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : undefined);
    };
    audio.onerror = () => finish();
    const timeout = setTimeout(() => finish(), METADATA_TIMEOUT_MS);

    try {
      audio.preload = 'metadata';
      audio.src = objectUrl;
      audio.load();
    } catch {
      finish();
    }
  });
}

interface AudioUploadOptions {
  upload: (file: File) => Promise<MediaUploadResult>;
  onUploaded: (result: MediaUploadResult, duration?: number) => void;
  onDurationUnavailable: () => void;
  readDuration?: (file: File) => Promise<number>;
}

export async function uploadAudioWithDuration(
  file: File | undefined,
  options: AudioUploadOptions,
): Promise<MediaUploadResult | undefined> {
  if (!file) return undefined;

  let duration: number | undefined;
  try {
    duration = await (options.readDuration ?? readLocalAudioDuration)(file);
  } catch {
    options.onDurationUnavailable();
  }

  const result = await options.upload(file);
  options.onUploaded(result, duration);
  return result;
}
