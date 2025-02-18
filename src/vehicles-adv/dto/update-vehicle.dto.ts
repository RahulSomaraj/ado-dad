import { PartialType } from '@nestjs/swagger';
import { CreateVehicleAdvDto } from './create-vehicle-adv.dto';

export class UpdateVehicleAdvDto extends PartialType(CreateVehicleAdvDto) {}
