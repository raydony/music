import { PartialType } from '@nestjs/swagger';
import { CreateTrackDto } from './create-track.dto.js';

export class UpdateTrackDto extends PartialType(CreateTrackDto) {}
