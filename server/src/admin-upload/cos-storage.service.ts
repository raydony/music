import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import COS from 'cos-nodejs-sdk-v5';
import { ApiException } from '../common/errors/api.exception.js';
import type { CosUploadInput, CosUploadResult } from './admin-upload.types.js';

interface CosSettings {
  secretId: string;
  secretKey: string;
  bucket: string;
  region: string;
  publicBaseUrl: string;
}

@Injectable()
export class CosStorageService {
  private readonly logger = new Logger(CosStorageService.name);
  private client?: COS;
  private settings?: CosSettings;

  constructor(private readonly configService: ConfigService) {}

  async upload(input: CosUploadInput): Promise<CosUploadResult> {
    const settings = this.getSettings();
    const client = this.getClient(settings);

    try {
      await client.uploadFile({
        Bucket: settings.bucket,
        Region: settings.region,
        Key: input.key,
        FilePath: input.filePath,
        ContentType: input.contentType,
        SliceSize: 5 * 1024 * 1024,
      });
    } catch {
      this.logger.error('COS media upload failed');
      throw new ApiException(
        HttpStatus.BAD_GATEWAY,
        'COS_UPLOAD_FAILED',
        '媒体文件上传失败，请稍后重试',
      );
    }

    const encodedKey = input.key.split('/').map(encodeURIComponent).join('/');
    return { url: `${settings.publicBaseUrl}/${encodedKey}` };
  }

  private getClient(settings: CosSettings): COS {
    if (!this.client) {
      this.client = new COS({
        SecretId: settings.secretId,
        SecretKey: settings.secretKey,
        Protocol: 'https:',
        ChunkRetryTimes: 2,
        FileParallelLimit: 2,
        ChunkParallelLimit: 2,
      });
    }
    return this.client;
  }

  private getSettings(): CosSettings {
    if (this.settings) {
      return this.settings;
    }

    const secretId = this.readRequired('TENCENT_COS_SECRET_ID');
    const secretKey = this.readRequired('TENCENT_COS_SECRET_KEY');
    const bucket = this.readRequired('TENCENT_COS_BUCKET');
    const region = this.readRequired('TENCENT_COS_REGION');
    const configuredBaseUrl = this.configService.get<string>('TENCENT_COS_PUBLIC_BASE_URL')?.trim();
    const publicBaseUrl = configuredBaseUrl || `https://${bucket}.cos.${region}.myqcloud.com`;

    let parsedBaseUrl: URL;
    try {
      parsedBaseUrl = new URL(publicBaseUrl);
    } catch {
      throw this.configurationError();
    }
    if (
      parsedBaseUrl.protocol !== 'https:' ||
      parsedBaseUrl.username ||
      parsedBaseUrl.password ||
      parsedBaseUrl.search ||
      parsedBaseUrl.hash
    ) {
      throw this.configurationError();
    }

    this.settings = {
      secretId,
      secretKey,
      bucket,
      region,
      publicBaseUrl: publicBaseUrl.replace(/\/+$/, ''),
    };
    return this.settings;
  }

  private readRequired(name: string): string {
    const value = this.configService.get<string>(name)?.trim();
    if (!value) {
      throw this.configurationError();
    }
    return value;
  }

  private configurationError(): ApiException {
    return new ApiException(
      HttpStatus.SERVICE_UNAVAILABLE,
      'COS_NOT_CONFIGURED',
      '媒体存储服务尚未正确配置',
    );
  }
}
