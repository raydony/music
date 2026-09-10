import { Module } from '@nestjs/common';
import { AdminArtistsController } from './admin-artists.controller.js';
import { AdminArtistsService } from './admin-artists.service.js';

@Module({ controllers: [AdminArtistsController], providers: [AdminArtistsService] })
export class AdminArtistsModule {}
