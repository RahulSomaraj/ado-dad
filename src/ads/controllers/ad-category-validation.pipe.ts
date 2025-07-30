import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateVehicleAdDto } from '../dto/vehicle/create-vehicle-ad.dto';
import { CreatePropertyAdDto } from '../dto/property/create-property-ad.dto';
import { CreateCommercialVehicleAdDto } from '../dto/commercial-vehicle/create-commercial-vehicle-ad.dto';

@Injectable()
export class AdCategoryValidationPipe implements PipeTransform {
  transform(value: any) {
    const { category, data } = value;
    let dtoClass;

    switch (category) {
      case 'private_vehicle':
        dtoClass = CreateVehicleAdDto;
        break;
      case 'property':
        dtoClass = CreatePropertyAdDto;
        break;
      case 'commercial_vehicle':
        dtoClass = CreateCommercialVehicleAdDto;
        break;
      // Add more cases as needed
      default:
        throw new BadRequestException('Invalid category');
    }

    const instance = plainToInstance(dtoClass, data);
    const errors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: true });

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    // Replace data with validated instance
    return { ...value, data: instance };
  }
} 