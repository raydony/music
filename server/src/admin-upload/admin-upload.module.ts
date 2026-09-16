import { Module } from '@nestjs/common';
import { AdminUploadController } from './admin-upload.controller.js';
import { AdminUploadService } from './admin-upload.service.js';
import { CosStorageService } from './cos-storage.service.js';

@Module({
  controllers: [AdminUploadController],
  providers: [AdminUploadService, CosStorageService],
  exports: [CosStorageService],
})
export class AdminUploadModule {}
