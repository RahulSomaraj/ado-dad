import { Injectable } from '@nestjs/common';
import { CreateAdV2Dto, AdCategoryV2 } from '../../dto/create-ad-v2.dto';
import { CommercialVehicleDetectionService } from '../../../ads/services/commercial-vehicle-detection.service';

@Injectable()
export class CommercialIntentService {
  constructor(private readonly detector: CommercialVehicleDetectionService) {}

  async applyIfCommercial(dto: CreateAdV2Dto): Promise<CreateAdV2Dto> {
    if (
      dto.category !== AdCategoryV2.COMMERCIAL_VEHICLE ||
      !dto.commercial?.modelId
    ) {
      return dto;
    }

    try {
      const defaults = await this.detector.detectCommercialVehicleDefaults(
        dto.commercial.modelId,
      );
      const c = dto.commercial;

      return {
        ...dto,
        commercial: {
          ...c,
          commercialVehicleType:
            c.commercialVehicleType ?? defaults.commercialVehicleType,
          bodyType: c.bodyType ?? defaults.bodyType,
          payloadCapacity: c.payloadCapacity ?? defaults.payloadCapacity,
          payloadUnit: c.payloadUnit ?? defaults.payloadUnit,
          axleCount: c.axleCount ?? defaults.axleCount,
          seatingCapacity: c.seatingCapacity ?? defaults.seatingCapacity,
        },
      };
    } catch (error) {
      // If detection fails, return original DTO
      console.warn('Commercial vehicle detection failed:', error);
      return dto;
    }
  }
}
