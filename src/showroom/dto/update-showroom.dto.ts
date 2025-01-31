import { PartialType } from '@nestjs/swagger';
import { CreateShowroomDto } from './create-showroom.dto';

export class UpdateShowroomDto extends PartialType(CreateShowroomDto) {}
