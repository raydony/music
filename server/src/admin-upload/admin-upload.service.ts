import { HttpStatus, Injectable } from '@nestjs/common';
import { open, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, extname } from 'node:path';
import { TextDecoder } from 'node:util';
import { randomUUID } from 'node:crypto';
import { ApiException } from '../common/errors/api.exception.js';
import { UPLOAD_LIMITS, UPLOAD_TEMP_PREFIX } from './admin-upload.constants.js';
import type { AdminUploadResult, AdminUploadType } from './admin-upload.types.js';
import { CosStorageService } from './cos-storage.service.js';

interface ValidatedFile {
  extension: string;
  contentType: string;
  content?: string;
}

interface FileRule {
  mimeTypes: readonly string[];
  contentType: string;
  matchesSignature: (header: Buffer) => boolean;
}

function startsWithId3v2(header: Buffer): boolean {
  return header.length >= 3 && header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33;
}

function startsWithMpegAudioFrame(header: Buffer): boolean {
  if (header.length < 4 || header[0] !== 0xff || (header[1] & 0xe0) !== 0xe0) {
    return false;
  }

  const versionBits = (header[1] >> 3) & 0x03;
  const layerBits = (header[1] >> 1) & 0x03;
  const sampleRateBits = (header[2] >> 2) & 0x03;

  return versionBits !== 0x01 && layerBits !== 0x00 && sampleRateBits !== 0x03;
}

function matchesMp3Signature(header: Buffer): boolean {
  return startsWithId3v2(header) || startsWithMpegAudioFrame(header);
}

const AUDIO_RULES: Record<string, FileRule> = {
  mp3: {
    mimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/x-mpeg', 'application/octet-stream'],
    contentType: 'audio/mpeg',
    matchesSignature: matchesMp3Signature,
  },
  m4a: {
    mimeTypes: ['audio/mp4', 'audio/x-m4a'],
    contentType: 'audio/mp4',
    matchesSignature: (header) =>
      header.length >= 12 && header.subarray(4, 8).toString() === 'ftyp',
  },
  wav: {
    mimeTypes: ['audio/wav', 'audio/x-wav', 'audio/wave'],
    contentType: 'audio/wav',
    matchesSignature: (header) =>
      header.length >= 12 &&
      header.subarray(0, 4).toString() === 'RIFF' &&
      header.subarray(8, 12).toString() === 'WAVE',
  },
  flac: {
    mimeTypes: ['audio/flac', 'audio/x-flac'],
    contentType: 'audio/flac',
    matchesSignature: (header) => header.subarray(0, 4).toString() === 'fLaC',
  },
};

const COVER_RULES: Record<string, FileRule> = {
  jpg: {
    mimeTypes: ['image/jpeg'],
    contentType: 'image/jpeg',
    matchesSignature: (header) =>
      header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff,
  },
  jpeg: {
    mimeTypes: ['image/jpeg'],
    contentType: 'image/jpeg',
    matchesSignature: (header) =>
      header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff,
  },
  png: {
    mimeTypes: ['image/png'],
    contentType: 'image/png',
    matchesSignature: (header) =>
      header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  webp: {
    mimeTypes: ['image/webp'],
    contentType: 'image/webp',
    matchesSignature: (header) =>
      header.length >= 12 &&
      header.subarray(0, 4).toString() === 'RIFF' &&
      header.subarray(8, 12).toString() === 'WEBP',
  },
};

const LYRICS_EXTENSIONS = new Set(['lrc', 'txt']);
const LYRICS_MIME_TYPES = new Set(['text/plain', 'application/octet-stream']);

@Injectable()
export class AdminUploadService {
  constructor(private readonly cosStorage: CosStorageService) {}

  async upload(
    file: Express.Multer.File | undefined,
    rawType: string | undefined,
  ): Promise<AdminUploadResult> {
    if (!file) {
      throw new ApiException(HttpStatus.BAD_REQUEST, 'FILE_REQUIRED', '请选择要上传的文件');
    }

    try {
      const type = this.parseType(rawType);
      const actualSize = (await stat(file.path)).size;
      const validated = await this.validateFile(file, type, actualSize);
      const key = this.createObjectKey(type, validated.extension);
      const uploaded = await this.cosStorage.upload({
        key,
        filePath: file.path,
        contentType: validated.contentType,
      });

      return {
        type,
        key,
        url: uploaded.url,
        originalName: this.safeOriginalName(file.originalname),
        size: actualSize,
        ...(validated.content === undefined ? {} : { content: validated.content }),
      } satisfies AdminUploadResult;
    } finally {
      await this.cleanup(file.path);
    }
  }

  private parseType(value: string | undefined): AdminUploadType {
    if (value === 'audio' || value === 'cover' || value === 'lyrics') {
      return value;
    }
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      'INVALID_UPLOAD_TYPE',
      'type 只允许 audio、cover 或 lyrics',
    );
  }

  private async validateFile(
    file: Express.Multer.File,
    type: AdminUploadType,
    actualSize: number,
  ): Promise<ValidatedFile> {
    if (actualSize <= 0) {
      throw new ApiException(HttpStatus.BAD_REQUEST, 'EMPTY_FILE', '不能上传空文件');
    }
    if (actualSize > UPLOAD_LIMITS[type]) {
      throw new ApiException(
        HttpStatus.PAYLOAD_TOO_LARGE,
        'FILE_TOO_LARGE',
        `文件超过 ${UPLOAD_LIMITS[type] / 1024 / 1024} MB 限制`,
      );
    }

    const extension = extname(file.originalname).slice(1).toLowerCase();
    const mimeType = file.mimetype.toLowerCase().split(';')[0].trim();
    if (type === 'lyrics') {
      return this.validateLyrics(file.path, extension, mimeType);
    }

    const rules = type === 'audio' ? AUDIO_RULES : COVER_RULES;
    const rule = rules[extension];
    if (!rule) {
      throw this.invalidFileType(type);
    }

    const header = await this.readHeader(file.path);
    if (!rule.matchesSignature(header)) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'FILE_SIGNATURE_MISMATCH',
        '文件内容与扩展名或 MIME 类型不匹配',
      );
    }
    if (!rule.mimeTypes.includes(mimeType)) {
      throw this.invalidFileType(type);
    }

    return { extension, contentType: rule.contentType };
  }

  private async validateLyrics(
    filePath: string,
    extension: string,
    mimeType: string,
  ): Promise<ValidatedFile> {
    if (!LYRICS_EXTENSIONS.has(extension) || !LYRICS_MIME_TYPES.has(mimeType)) {
      throw this.invalidFileType('lyrics');
    }

    const bytes = await readFile(filePath);
    let content: string;
    try {
      content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'INVALID_LYRICS_ENCODING',
        '歌词文件必须使用 UTF-8 编码',
      );
    }

    content = content.replace(/^\uFEFF/, '');
    if (!content.trim() || content.includes('\0')) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'INVALID_LYRICS_CONTENT',
        '歌词文件必须是非空 UTF-8 文本',
      );
    }

    return { extension, contentType: 'text/plain; charset=utf-8', content };
  }

  private invalidFileType(type: AdminUploadType): ApiException {
    const allowed = {
      audio: 'mp3、m4a、wav、flac',
      cover: 'jpg、jpeg、png、webp',
      lyrics: 'lrc、txt',
    }[type];
    return new ApiException(
      HttpStatus.BAD_REQUEST,
      'INVALID_FILE_TYPE',
      `不支持该文件，${type} 只允许 ${allowed}`,
    );
  }

  private async readHeader(filePath: string): Promise<Buffer> {
    const handle = await open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(32);
      const result = await handle.read(buffer, 0, buffer.length, 0);
      return buffer.subarray(0, result.bytesRead);
    } finally {
      await handle.close();
    }
  }

  private createObjectKey(type: AdminUploadType, extension: string): string {
    const now = new Date();
    const folder = type === 'cover' ? 'covers' : type;
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${folder}/${year}/${month}/${randomUUID()}.${extension}`;
  }

  private safeOriginalName(originalName: string): string {
    const name = basename(originalName.replaceAll('\\', '/')) || 'unnamed';
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    return decoded.includes('\uFFFD') ? name : decoded;
  }

  private async cleanup(filePath: string): Promise<void> {
    const directory = dirname(filePath);
    if (dirname(directory) !== tmpdir() || !basename(directory).startsWith(UPLOAD_TEMP_PREFIX)) {
      return;
    }
    await rm(directory, { recursive: true, force: true });
  }
}
