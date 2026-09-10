import { Module } from '@nestjs/common';
import { CatalogRelationsService } from '../catalog-relations.service.js';
import { AdminTracksController } from './admin-tracks.controller.js';
import { AdminTracksService } from './admin-tracks.service.js';

@Module({
  controllers: [AdminTracksController],
  providers: [AdminTracksService, CatalogRelationsService],
})
export class AdminTracksModule {}
