import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AlbumsModule } from './albums/albums.module.js';
import { ArtistsModule } from './artists/artists.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { TracksModule } from './tracks/tracks.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    TracksModule,
    AlbumsModule,
    ArtistsModule,
    CategoriesModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
