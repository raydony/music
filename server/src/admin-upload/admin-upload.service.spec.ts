import { access, mkdtemp, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { Readable } from 'node:stream';
import { UPLOAD_LIMITS, UPLOAD_TEMP_PREFIX } from './admin-upload.constants.js';
import { AdminUploadService } from './admin-upload.service.js';
import type { CosUploadInput } from './admin-upload.types.js';
import { CosStorageService } from './cos-storage.service.js';

interface TestFileOptions {
  originalName: string;
  mimeType: string;
  content: Buffer | string;
  size?: number;
}

describe('AdminUploadService', () => {
  const uploaded: CosUploadInput[] = [];
  const cosStorage = {
    upload: vi.fn(async (input: CosUploadInput) => {
      uploaded.push(input);
      return { url: `https://test.cos.ap-beijing.myqcloud.com/${input.key}` };
    }),
  } as unknown as CosStorageService;
  const service = new AdminUploadService(cosStorage);

  beforeEach(() => {
    uploaded.length = 0;
    vi.clearAllMocks();
  });

  async function createFile(options: TestFileOptions): Promise<Express.Multer.File> {
    const destination = await mkdtemp(join(tmpdir(), UPLOAD_TEMP_PREFIX));
    const filePath = join(destination, 'upload');
    await writeFile(filePath, options.content);
    if (options.size !== undefined) {
      await truncate(filePath, options.size);
    }

    return {
      fieldname: 'file',
      originalname: options.originalName,
      encoding: '7bit',
      mimetype: options.mimeType,
      size: options.size ?? Buffer.byteLength(options.content),
      destination,
      filename: basename(filePath),
      path: filePath,
      buffer: Buffer.alloc(0),
      stream: Readable.from([]),
    };
  }

  async function expectCleaned(filePath: string): Promise<void> {
    await expect(access(filePath)).rejects.toThrow();
  }

  it('accepts a valid MP3 that starts with an ID3v2 tag', async () => {
    const file = await createFile({
      originalName: '炉香赞.mp3',
      mimeType: 'audio/mpeg',
      content: Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    });

    const result = await service.upload(file, 'audio');

    expect(result).toMatchObject({ type: 'audio', originalName: '炉香赞.mp3' });
    expect(result.key).toMatch(/^audio\/\d{4}\/\d{2}\/[0-9a-f-]+\.mp3$/);
    expect(uploaded[0]).toMatchObject({ filePath: file.path, contentType: 'audio/mpeg' });
    await expectCleaned(file.path);
  });

  it('accepts a valid MP3 that starts directly with an MPEG audio frame', async () => {
    const file = await createFile({
      originalName: 'frame-header.mp3',
      mimeType: 'audio/mp3',
      content: Buffer.from([0xff, 0xfb, 0x90, 0x64, 0x00, 0x00]),
    });

    const result = await service.upload(file, 'audio');

    expect(result.type).toBe('audio');
    expect(uploaded[0]?.contentType).toBe('audio/mpeg');
    await expectCleaned(file.path);
  });

  it('accepts application/octet-stream only when the MP3 extension and signature match', async () => {
    const file = await createFile({
      originalName: 'browser-upload.mp3',
      mimeType: 'application/octet-stream',
      content: Buffer.from([0xff, 0xfb, 0x90, 0x64, 0x00, 0x00]),
    });

    const result = await service.upload(file, 'audio');

    expect(result.key).toMatch(/\.mp3$/);
    expect(cosStorage.upload).toHaveBeenCalledOnce();
    await expectCleaned(file.path);
  });

  it('accepts audio/x-mpeg for a confirmed MP3', async () => {
    const file = await createFile({
      originalName: 'legacy-browser.mp3',
      mimeType: 'audio/x-mpeg',
      content: Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00]),
    });

    await expect(service.upload(file, 'audio')).resolves.toMatchObject({ type: 'audio' });
    await expectCleaned(file.path);
  });

  it('rejects an executable extension', async () => {
    const file = await createFile({
      originalName: 'malware.exe',
      mimeType: 'application/octet-stream',
      content: Buffer.from('MZ executable'),
    });

    await expect(service.upload(file, 'audio')).rejects.toMatchObject({ status: 400 });
    expect(cosStorage.upload).not.toHaveBeenCalled();
    await expectCleaned(file.path);
  });

  it('rejects a forged MP3 whose content signature does not match', async () => {
    const file = await createFile({
      originalName: 'forged.mp3',
      mimeType: 'application/octet-stream',
      content: Buffer.from('MZ executable renamed to mp3'),
    });

    await expect(service.upload(file, 'audio')).rejects.toMatchObject({ status: 400 });
    expect(cosStorage.upload).not.toHaveBeenCalled();
    await expectCleaned(file.path);
  });

  it('rejects a renamed executable even when its MIME claims audio/mpeg', async () => {
    const file = await createFile({
      originalName: 'renamed.mp3',
      mimeType: 'audio/mpeg',
      content: Buffer.from('MZ executable renamed to mp3'),
    });

    await expect(service.upload(file, 'audio')).rejects.toMatchObject({ status: 400 });
    expect(cosStorage.upload).not.toHaveBeenCalled();
    await expectCleaned(file.path);
  });

  it('rejects an MP3 signature paired with an unrelated MIME type', async () => {
    const file = await createFile({
      originalName: 'mismatch.mp3',
      mimeType: 'application/x-msdownload',
      content: Buffer.from([0xff, 0xfb, 0x90, 0x64, 0x00, 0x00]),
    });

    await expect(service.upload(file, 'audio')).rejects.toMatchObject({ status: 400 });
    expect(cosStorage.upload).not.toHaveBeenCalled();
    await expectCleaned(file.path);
  });

  it('rejects a file above the type-specific size limit', async () => {
    const file = await createFile({
      originalName: 'large.jpg',
      mimeType: 'image/jpeg',
      content: Buffer.from([0xff, 0xd8, 0xff]),
      size: UPLOAD_LIMITS.cover + 1,
    });

    await expect(service.upload(file, 'cover')).rejects.toMatchObject({ status: 413 });
    expect(cosStorage.upload).not.toHaveBeenCalled();
    await expectCleaned(file.path);
  });

  it('generates different object keys for files with the same name', async () => {
    const first = await createFile({
      originalName: 'same.mp3',
      mimeType: 'audio/mpeg',
      content: Buffer.from('ID3-first', 'binary'),
    });
    const second = await createFile({
      originalName: 'same.mp3',
      mimeType: 'audio/mpeg',
      content: Buffer.from('ID3-second', 'binary'),
    });

    const firstResult = await service.upload(first, 'audio');
    const secondResult = await service.upload(second, 'audio');

    expect(firstResult.key).not.toBe(secondResult.key);
  });

  it('returns UTF-8 LRC text while also backing up the file to COS', async () => {
    const content = '[00:00.00]炉香乍爇\n[00:05.20]法界蒙熏';
    const file = await createFile({
      originalName: '唱词.lrc',
      mimeType: 'text/plain',
      content: `\uFEFF${content}`,
    });

    const result = await service.upload(file, 'lyrics');

    expect(result.content).toBe(content);
    expect(result.key).toMatch(/^lyrics\/\d{4}\/\d{2}\/[0-9a-f-]+\.lrc$/);
    expect(uploaded[0]?.contentType).toBe('text/plain; charset=utf-8');
    await expectCleaned(file.path);
  });
});
