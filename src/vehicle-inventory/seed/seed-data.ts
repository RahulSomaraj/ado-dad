import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FuelType, FuelTypeDocument } from '../schemas/fuel-type.schema';
import {
  TransmissionType,
  TransmissionTypeDocument,
} from '../schemas/transmission-type.schema';

@Injectable()
export class SeedDataService {
  constructor(
    @InjectModel(FuelType.name)
    private readonly fuelTypeModel: Model<FuelTypeDocument>,
    @InjectModel(TransmissionType.name)
    private readonly transmissionTypeModel: Model<TransmissionTypeDocument>,
  ) {}

  async seedFuelTypes(): Promise<void> {
    const fuelTypes = [
      {
        name: 'Petrol',
        displayName: 'Petrol',
        description: 'Conventional petrol fuel',
        icon: 'fuel-petrol',
        color: '#FF6B35',
        sortOrder: 1,
      },
      {
        name: 'Diesel',
        displayName: 'Diesel',
        description: 'Conventional diesel fuel',
        icon: 'fuel-diesel',
        color: '#2E4057',
        sortOrder: 2,
      },
      {
        name: 'CNG',
        displayName: 'CNG',
        description: 'Compressed Natural Gas',
        icon: 'fuel-cng',
        color: '#4CAF50',
        sortOrder: 3,
      },
      {
        name: 'Electric',
        displayName: 'Electric',
        description: 'Battery Electric Vehicle',
        icon: 'fuel-electric',
        color: '#2196F3',
        sortOrder: 4,
      },
      {
        name: 'Hybrid',
        displayName: 'Hybrid',
        description: 'Hybrid Electric Vehicle',
        icon: 'fuel-hybrid',
        color: '#9C27B0',
        sortOrder: 5,
      },
      {
        name: 'Plugin_Hybrid',
        displayName: 'Plugin Hybrid',
        description: 'Plugin Hybrid Electric Vehicle',
        icon: 'fuel-plugin-hybrid',
        color: '#FF9800',
        sortOrder: 6,
      },
      {
        name: 'Flex_Fuel',
        displayName: 'Flex Fuel',
        description: 'Flexible Fuel Vehicle',
        icon: 'fuel-flex',
        color: '#795548',
        sortOrder: 7,
      },
    ];

    for (const fuelType of fuelTypes) {
      const exists = await this.fuelTypeModel
        .findOne({ name: fuelType.name })
        .exec();
      if (!exists) {
        await this.fuelTypeModel.create(fuelType);
        console.log(`Created fuel type: ${fuelType.displayName}`);
      }
    }
  }

  async seedTransmissionTypes(): Promise<void> {
    const transmissionTypes = [
      {
        name: 'Manual',
        displayName: 'Manual',
        description: 'Manual transmission',
        icon: 'transmission-manual',
        abbreviation: 'MT',
        sortOrder: 1,
      },
      {
        name: 'Automatic',
        displayName: 'Automatic',
        description: 'Automatic transmission',
        icon: 'transmission-automatic',
        abbreviation: 'AT',
        sortOrder: 2,
      },
      {
        name: 'AMT',
        displayName: 'AMT',
        description: 'Automated Manual Transmission',
        icon: 'transmission-amt',
        abbreviation: 'AMT',
        sortOrder: 3,
      },
      {
        name: 'CVT',
        displayName: 'CVT',
        description: 'Continuously Variable Transmission',
        icon: 'transmission-cvt',
        abbreviation: 'CVT',
        sortOrder: 4,
      },
      {
        name: 'Dual_Clutch',
        displayName: 'Dual-Clutch',
        description: 'Dual-Clutch Transmission',
        icon: 'transmission-dual-clutch',
        abbreviation: 'DCT',
        sortOrder: 5,
      },
      {
        name: 'Semi_Automatic',
        displayName: 'Semi-Automatic',
        description: 'Semi-Automatic Transmission',
        icon: 'transmission-semi-auto',
        abbreviation: 'SAT',
        sortOrder: 6,
      },
      {
        name: 'IMT',
        displayName: 'IMT',
        description: 'Intelligent Manual Transmission',
        icon: 'transmission-imt',
        abbreviation: 'IMT',
        sortOrder: 7,
      },
    ];

    for (const transmissionType of transmissionTypes) {
      const exists = await this.transmissionTypeModel
        .findOne({ name: transmissionType.name })
        .exec();
      if (!exists) {
        await this.transmissionTypeModel.create(transmissionType);
        console.log(
          `Created transmission type: ${transmissionType.displayName}`,
        );
      }
    }
  }

  async seedAll(): Promise<void> {
    console.log('Starting seed data population...');

    await this.seedFuelTypes();
    await this.seedTransmissionTypes();

    console.log('Seed data population completed!');
  }
}
