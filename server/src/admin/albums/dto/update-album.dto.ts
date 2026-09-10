import { PartialType } from '@nestjs/swagger';
import { CreateAlbumDto } from './create-album.dto.js';

export class UpdateAlbumDto extends PartialType(CreateAlbumDto) {}
