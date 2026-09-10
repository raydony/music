import { Module } from '@nestjs/common';
import { AdminAlbumsModule } from './albums/admin-albums.module.js';
import { AdminArtistsModule } from './artists/admin-artists.module.js';
import { AdminCategoriesModule } from './categories/admin-categories.module.js';
import { AdminTracksModule } from './tracks/admin-tracks.module.js';

@Module({
  imports: [AdminTracksModule, AdminAlbumsModule, AdminArtistsModule, AdminCategoriesModule],
})
export class AdminModule {}
