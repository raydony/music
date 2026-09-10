import { PartialType } from '@nestjs/swagger';
import { CreateArtistDto } from './create-artist.dto.js';

export class UpdateArtistDto extends PartialType(CreateArtistDto) {}
