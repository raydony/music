import { Module } from '@nestjs/common';
import { CatalogRelationsService } from '../catalog-relations.service.js';
import { AdminAlbumsController } from './admin-albums.controller.js';
import { AdminAlbumsService } from './admin-albums.service.js';

@Module({
  controllers: [AdminAlbumsController],
  providers: [AdminAlbumsService, CatalogRelationsService],
})
export class AdminAlbumsModule {}
