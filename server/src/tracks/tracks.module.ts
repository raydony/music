import { Module } from '@nestjs/common';
import { TracksController } from './tracks.controller.js';
import { TracksService } from './tracks.service.js';

@Module({ controllers: [TracksController], providers: [TracksService] })
export class TracksModule {}
