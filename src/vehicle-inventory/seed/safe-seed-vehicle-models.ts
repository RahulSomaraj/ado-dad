import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  VehicleModel,
  VehicleModelDocument,
} from '../schemas/vehicle-model.schema';
import {
  Manufacturer,
  ManufacturerDocument,
} from '../schemas/manufacturer.schema';
import { TestDataSafetyService } from '../../common/services/test-data-safety.service';
import { SafeTestDataManagerService } from '../../common/services/safe-test-data-manager.service';
import {
  TestDataSafe,
  AuditDatabaseOperations,
  ValidateEnvironment,
} from '../../common/decorators/test-data-safety.decorators';
import { VehicleTypes } from '../../vehicles/enum/vehicle.type';

@Injectable()
export class SafeVehicleModelSeedService {
  private readonly logger = new Logger(SafeVehicleModelSeedService.name);

  constructor(
    @InjectModel(VehicleModel.name)
    private readonly vehicleModelModel: Model<VehicleModelDocument>,
    @InjectModel(Manufacturer.name)
    private readonly manufacturerModel: Model<ManufacturerDocument>,
    private readonly testDataSafetyService: TestDataSafetyService,
    private readonly safeTestDataManager: SafeTestDataManagerService,
  ) {}

  private curatedModels: Record<
    string,
    Array<{
      name: string;
      displayName: string;
      vehicleType: VehicleTypes;
      bodyType?: string;
      segment?: string;
      launchYear?: number;
    }>
  > = {
    // India
    maruti_suzuki: [
      {
        name: 'alto',
        displayName: 'Alto',
        vehicleType: VehicleTypes.HATCHBACK,
        bodyType: 'Hatchback',
        segment: 'A',
        launchYear: 2012,
      },
      {
        name: 'swift',
        displayName: 'Swift',
        vehicleType: VehicleTypes.HATCHBACK,
        bodyType: 'Hatchback',
        segment: 'B',
        launchYear: 2018,
      },
      {
        name: 'baleno',
        displayName: 'Baleno',
        vehicleType: VehicleTypes.HATCHBACK,
        bodyType: 'Hatchback',
        segment: 'B',
        launchYear: 2020,
      },
      {
        name: 'ciaz',
        displayName: 'Ciaz',
        vehicleType: VehicleTypes.SEDAN,
        bodyType: 'Sedan',
        segment: 'C',
        launchYear: 2017,
      },
      {
        name: 'dzire',
        displayName: 'Dzire',
        vehicleType: VehicleTypes.SEDAN,
        bodyType: 'Sedan',
        segment: 'B',
        launchYear: 2019,
      },
      {
        name: 'wagon_r',
        displayName: 'Wagon R',
        vehicleType: VehicleTypes.HATCHBACK,
        bodyType: 'Hatchback',
        segment: 'A',
        launchYear: 2015,
      },
      {
        name: 'ertiga',
        displayName: 'Ertiga',
        vehicleType: VehicleTypes.MUV,
        bodyType: 'MUV',
        segment: 'C',
        launchYear: 2021,
      },
      {
        name: 'grand_vitara',
        displayName: 'Grand Vitara',
        vehicleType: VehicleTypes.SUV,
        bodyType: 'SUV',
        segment: 'C',
        launchYear: 2022,
      },
      {
        name: 'fronx',
        displayName: 'Fronx',
        vehicleType: VehicleTypes.SUB_COMPACT_SUV,
        bodyType: 'SUV',
        segment: 'B',
        launchYear: 2023,
      },
      {
        name: 'jimny',
        displayName: 'Jimny',
        vehicleType: VehicleTypes.SUV,
        bodyType: 'SUV',
        segment: 'B',
        launchYear: 2023,
      },
    ],
    tata_motors: [
      {
        name: 'tiago',
        displayName: 'Tiago',
        vehicleType: VehicleTypes.HATCHBACK,
        bodyType: 'Hatchback',
        segment: 'B',
        launchYear: 2019,
      },
      {
        name: 'altroz',
        displayName: 'Altroz',
        vehicleType: VehicleTypes.HATCHBACK,
        bodyType: 'Hatchback',
        segment: 'B',
        launchYear: 2020,
      },
      {
        name: 'tigor',
        displayName: 'Tigor',
        vehicleType: VehicleTypes.SEDAN,
        bodyType: 'Sedan',
        segment: 'B',
        launchYear: 2019,
      },
      {
        name: 'nexon',
        displayName: 'Nexon',
        vehicleType: VehicleTypes.SUB_COMPACT_SUV,
        bodyType: 'SUV',
        segment: 'B',
        launchYear: 2023,
      },
      {
        name: 'harrier',
        displayName: 'Harrier',
        vehicleType: VehicleTypes.SUV,
        bodyType: 'SUV',
        segment: 'D',
        launchYear: 2020,
      },
      {
        name: 'safari',
        displayName: 'Safari',
        vehicleType: VehicleTypes.SUV,
        bodyType: 'SUV',
        segment: 'D',
        launchYear: 2021,
      },
      {
        name: 'punch',
        displayName: 'Punch',
        vehicleType: VehicleTypes.COMPACT_SUV,
        bodyType: 'SUV',
        segment: 'B',
        launchYear: 2022,
      },
      {
        name: 'tiago_ev',
        displayName: 'Tiago EV',
        vehicleType: VehicleTypes.HATCHBACK,
        bodyType: 'Hatchback',
        segment: 'B',
        launchYear: 2022,
      },
      {
        name: 'nexon_ev',
        displayName: 'Nexon EV',
        vehicleType: VehicleTypes.SUB_COMPACT_SUV,
        bodyType: 'SUV',
        segment: 'B',
        launchYear: 2022,
      },
      {
        name: 'altroz_racer',
        displayName: 'Altroz Racer',
        vehicleType: VehicleTypes.HATCHBACK,
        bodyType: 'Hatchback',
        segment: 'B',
        launchYear: 2024,
      },
    ],
    hyundai: [
      {
        name: 'i10',
        displayName: 'Grand i10 Nios',
        vehicleType: VehicleTypes.HATCHBACK,
        bodyType: 'Hatchback',
        segment: 'B',
        launchYear: 2020,
      },
      {
        name: 'i20',
        displayName: 'i20',
        vehicleType: VehicleTypes.HATCHBACK,
        bodyType: 'Hatchback',
        segment: 'B',
        launchYear: 2021,
      },
      {
        name: 'aura',
        displayName: 'Aura',
        vehicleType: VehicleTypes.SEDAN,
        bodyType: 'Sedan',
        segment: 'B',
        launchYear: 2020,
      },
      {
        name: 'venue',
        displayName: 'Venue',
        vehicleType: VehicleTypes.SUB_COMPACT_SUV,
        bodyType: 'SUV',
        segment: 'B',
        launchYear: 2022,
      },
      {
        name: 'creta',
        displayName: 'Creta',
        vehicleType: VehicleTypes.SUV,
        bodyType: 'SUV',
        segment: 'C',
        launchYear: 2021,
      },
      {
        name: 'alcazar',
        displayName: 'Alcazar',
        vehicleType: VehicleTypes.SUV,
        bodyType: 'SUV',
        segment: 'D',
        launchYear: 2022,
      },
      {
        name: 'verna',
        displayName: 'Verna',
        vehicleType: VehicleTypes.SEDAN,
        bodyType: 'Sedan',
        segment: 'C',
        launchYear: 2023,
      },
      {
        name: 'exter',
        displayName: 'Exter',
        vehicleType: VehicleTypes.SUB_COMPACT_SUV,
        bodyType: 'SUV',
        segment: 'A',
        launchYear: 2023,
      },
      {
        name: 'ioniq5',
        displayName: 'IONIQ 5',
        vehicleType: VehicleTypes.SUV,
        bodyType: 'SUV',
        segment: 'D',
        launchYear: 2023,
      },
      {
        name: 'tucson',
        displayName: 'Tucson',
        vehicleType: VehicleTypes.SUV,
        bodyType: 'SUV',
        segment: 'D',
        launchYear: 2020,
      },
    ],
    honda: [
      {
        name: 'city',
        displayName: 'City',
        vehicleType: VehicleTypes.SEDAN,
        bodyType: 'Sedan',
        segment: 'C',
        launchYear: 2020,
      },
      {
        name: 'amaze',
        displayName: 'Amaze',
        vehicleType: VehicleTypes.SEDAN,
        bodyType: 'Sedan',
        segment: 'B',
        launchYear: 2019,
      },
      {
        name: 'elevate',
        displayName: 'Elevate',
        vehicleType: VehicleTypes.SUV,
        bodyType: 'SUV',
        segment: 'C',
        launchYear: 2023,
      },
      {
        name: 'wrv',
        displayName: 'WR-V',
        vehicleType: VehicleTypes.SUB_COMPACT_SUV,
        bodyType: 'SUV',
        segment: 'B',
        launchYear: 2020,
      },
      {
        name: 'jazz',
        displayName: 'Jazz',
        vehicleType: VehicleTypes.HATCHBACK,
        bodyType: 'Hatchback',
        segment: 'B',
        launchYear: 2019,
      },
      {
        name: 'city_hybrid',
        displayName: 'City e:HEV',
        vehicleType: VehicleTypes.SEDAN,
        bodyType: 'Sedan',
        segment: 'C',
        launchYear: 2022,
      },
      {
        name: 'brv',
        displayName: 'BR-V',
        vehicleType: VehicleTypes.MUV,
        bodyType: 'MUV',
        segment: 'C',
        launchYear: 2018,
      },
      {
        name: 'brio',
        displayName: 'Brio',
        vehicleType: VehicleTypes.HATCHBACK,
        bodyType: 'Hatchback',
        segment: 'A',
        launchYear: 2017,
      },
      {
        name: 'accord',
        displayName: 'Accord',
        vehicleType: VehicleTypes.SEDAN,
        bodyType: 'Sedan',
        segment: 'D',
        launchYear: 2018,
      },
      {
        name: 'crv',
        displayName: 'CR-V',
        vehicleType: VehicleTypes.SUV,
        bodyType: 'SUV',
        segment: 'D',
        launchYear: 2018,
      },
    ],
    toyota: [
      {
        name: 'glanza',
        displayName: 'Glanza',
        vehicleType: VehicleTypes.HATCHBACK,
        bodyType: 'Hatchback',
        segment: 'B',
        launchYear: 2021,
      },
      {
        name: 'urban_cruiser_taisor',
        displayName: 'Urban Cruiser Taisor',
        vehicleType: VehicleTypes.SUB_COMPACT_SUV,
        bodyType: 'SUV',
        segment: 'B',
        launchYear: 2024,
      },
      {
        name: 'innova_hycross',
        displayName: 'Innova HyCross',
        vehicleType: VehicleTypes.MUV,
        bodyType: 'MUV',
        segment: 'D',
        launchYear: 2023,
      },
      {
        name: 'fortuner',
        displayName: 'Fortuner',
        vehicleType: VehicleTypes.SUV,
        bodyType: 'SUV',
        segment: 'D',
        launchYear: 2021,
      },
      {
        name: 'camry',
        displayName: 'Camry',
        vehicleType: VehicleTypes.SEDAN,
        bodyType: 'Sedan',
        segment: 'D',
        launchYear: 2021,
      },
      {
        name: 'corolla',
        displayName: 'Corolla Altis',
        vehicleType: VehicleTypes.SEDAN,
        bodyType: 'Sedan',
        segment: 'C',
        launchYear: 2018,
      },
      {
        name: 'rumion',
        displayName: 'Rumion',
        vehicleType: VehicleTypes.MUV,
        bodyType: 'MUV',
        segment: 'C',
        launchYear: 2023,
      },
      {
        name: 'hyryder',
        displayName: 'Urban Cruiser Hyryder',
        vehicleType: VehicleTypes.SUB_COMPACT_SUV,
        bodyType: 'SUV',
        segment: 'B',
        launchYear: 2023,
      },
      {
        name: 'land_cruiser',
        displayName: 'Land Cruiser',
        vehicleType: VehicleTypes.SUV,
        bodyType: 'SUV',
        segment: 'F',
        launchYear: 2022,
      },
      {
        name: 'vitz',
        displayName: 'Vitz',
        vehicleType: VehicleTypes.HATCHBACK,
        bodyType: 'Hatchback',
        segment: 'A',
        launchYear: 2018,
      },
    ],
    // Add more mappings as needed; fallback generator will be used otherwise
  };

  private fallbackSegments: Array<{
    vehicleType: VehicleTypes;
    bodyType: string;
    segment: string;
  }> = [
    {
      vehicleType: VehicleTypes.HATCHBACK,
      bodyType: 'Hatchback',
      segment: 'A',
    },
    {
      vehicleType: VehicleTypes.HATCHBACK,
      bodyType: 'Hatchback',
      segment: 'B',
    },
    { vehicleType: VehicleTypes.SEDAN, bodyType: 'Sedan', segment: 'C' },
    {
      vehicleType: VehicleTypes.SUB_COMPACT_SUV,
      bodyType: 'SUV',
      segment: 'B',
    },
    { vehicleType: VehicleTypes.COMPACT_SUV, bodyType: 'SUV', segment: 'B' },
    { vehicleType: VehicleTypes.SUV, bodyType: 'SUV', segment: 'C' },
    { vehicleType: VehicleTypes.SUV, bodyType: 'SUV', segment: 'D' },
    { vehicleType: VehicleTypes.MUV, bodyType: 'MUV', segment: 'C' },
    { vehicleType: VehicleTypes.COUPE, bodyType: 'Coupe', segment: 'D' },
    {
      vehicleType: VehicleTypes.CONVERTIBLE,
      bodyType: 'Convertible',
      segment: 'D',
    },
  ];

  private generateFallbackModels(
    manufacturer: ManufacturerDocument,
  ): Array<{
    name: string;
    displayName: string;
    vehicleType: VehicleTypes;
    bodyType?: string;
    segment?: string;
    launchYear?: number;
  }> {
    const models: Array<{
      name: string;
      displayName: string;
      vehicleType: VehicleTypes;
      bodyType?: string;
      segment?: string;
      launchYear?: number;
    }> = [];
    const base = manufacturer.displayName.replace(/[^a-z0-9]+/gi, ' ').trim();
    for (let i = 0; i < 10; i++) {
      const seg = this.fallbackSegments[i % this.fallbackSegments.length];
      const suffix = 100 + i * 5;
      models.push({
        name: `${manufacturer.name}_${seg.bodyType?.toLowerCase()?.replace(/\s+/g, '_')}_${suffix}`,
        displayName: `${base} ${seg.bodyType} ${suffix}`,
        vehicleType: seg.vehicleType,
        bodyType: seg.bodyType,
        segment: seg.segment,
        launchYear: 2016 + (i % 8),
      });
    }
    return models;
  }

  @TestDataSafe({
    collection: 'vehiclemodels',
    prefix: 'Seed',
    requireTestDataMarkers: true,
    allowHardDelete: false,
  })
  @AuditDatabaseOperations()
  @ValidateEnvironment()
  async seedVehicleModels(): Promise<void> {
    this.logger.log('🚗 Starting safe vehicle models seeding...');
    this.testDataSafetyService.validateEnvironmentForDestructiveOperation(
      'seed vehicle models',
    );

    const manufacturers = await this.manufacturerModel
      .find({ isDeleted: { $ne: true }, isActive: true })
      .exec();
    if (!manufacturers.length) {
      this.logger.warn('No manufacturers found. Seed manufacturers first.');
      return;
    }

    const createdIds: string[] = [];
    let created = 0;
    let reused = 0;
    let failed = 0;

    for (const mfr of manufacturers) {
      const key = (mfr.name || '').toLowerCase().replace(/\s+/g, '_');
      const curated = this.curatedModels[key];
      const desired =
        curated && curated.length >= 10
          ? curated.slice(0, 10)
          : this.generateFallbackModels(mfr);

      for (const modelData of desired) {
        try {
          const exists = await this.vehicleModelModel
            .findOne({ manufacturer: mfr._id, name: modelData.name })
            .exec();
          if (exists) {
            reused++;
            createdIds.push((exists._id as any).toString());
            this.logger.log(
              `🔄 Reusing existing model: ${exists.displayName} (${mfr.displayName})`,
            );
            continue;
          }

          const payload: Partial<VehicleModel> = {
            name: modelData.name,
            displayName: modelData.displayName,
            manufacturer: new Types.ObjectId(
              (mfr._id as unknown as any).toString(),
            ),
            vehicleType: modelData.vehicleType,
            bodyType: modelData.bodyType,
            segment: modelData.segment,
            launchYear: modelData.launchYear,
            isActive: true,
            isDeleted: false,
            // Allow all common fuel and transmission types; detailed variants will be strict
            fuelTypes: ['petrol', 'diesel', 'cng', 'electric', 'hybrid'],
            transmissionTypes: ['manual', 'automatic', 'cvt', 'dual_clutch'],
          };

          const safeData = this.safeTestDataManager.createTestDataWithMarkers(
            payload,
            'Seed',
          );
          const doc = new this.vehicleModelModel(safeData);
          const saved = await doc.save();
          createdIds.push((saved._id as any).toString());
          created++;
          this.logger.log(
            `✅ Created model: ${saved.displayName} (${mfr.displayName})`,
          );
        } catch (e: any) {
          failed++;
          this.logger.error(
            `❌ Failed to create model for ${mfr.displayName}: ${e.message}`,
          );
        }
      }
    }

    this.safeTestDataManager.registerTestData(
      'vehiclemodels',
      createdIds,
      'Seed',
    );
    this.logger.log(
      `📊 Vehicle models seeding summary: ${created} created, ${reused} existing, ${failed} failed`,
    );
  }

  @TestDataSafe({
    collection: 'vehiclemodels',
    prefix: 'Seed',
    requireTestDataMarkers: true,
    allowHardDelete: true,
  })
  @AuditDatabaseOperations()
  @ValidateEnvironment()
  async cleanupSeededVehicleModels(): Promise<{ deletedCount: number }> {
    this.logger.log('🧹 Cleaning up seeded vehicle models...');
    const result = await this.safeTestDataManager.safeCleanupTestData(
      'vehiclemodels',
      this.vehicleModelModel,
    );
    this.logger.log(`✅ Removed ${result.deletedCount} vehicle models`);
    return result as any;
  }

  async getSeededVehicleModelCount(): Promise<number> {
    return this.safeTestDataManager.getTestDataCount(
      'vehiclemodels',
      this.vehicleModelModel,
    );
  }

  async listSeededVehicleModels(): Promise<VehicleModelDocument[]> {
    const filter =
      this.safeTestDataManager.createSafeTestDataFilter('vehiclemodels');
    return this.vehicleModelModel.find(filter).exec();
  }

  async validateVehicleModelIntegrity(): Promise<boolean> {
    const manufacturers = await this.manufacturerModel
      .find({ isDeleted: { $ne: true }, isActive: true })
      .exec();
    const expectedPerManufacturer = 10;
    const expectedMin = Math.floor(
      manufacturers.length * expectedPerManufacturer * 0.8,
    );
    const actual = await this.getSeededVehicleModelCount();
    if (actual < expectedMin) {
      this.logger.error(
        `🚨 Vehicle model integrity failed: expected at least ${expectedMin}, actual ${actual}`,
      );
      return false;
    }
    this.logger.log(`✅ Vehicle model integrity ok: ${actual} models`);
    return true;
  }
}
