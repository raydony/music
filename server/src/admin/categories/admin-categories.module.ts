import { Module } from '@nestjs/common';
import { AdminCategoriesController } from './admin-categories.controller.js';
import { AdminCategoriesService } from './admin-categories.service.js';

@Module({ controllers: [AdminCategoriesController], providers: [AdminCategoriesService] })
export class AdminCategoriesModule {}
