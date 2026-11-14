import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  VehicleVariant,
  VehicleVariantDocument,
} from '../schemas/vehicle-variant.schema';
import {
  VehicleModel,
  VehicleModelDocument,
} from '../schemas/vehicle-model.schema';
import { FuelType, FuelTypeDocument } from '../schemas/fuel-type.schema';
import {
  TransmissionType,
  TransmissionTypeDocument,
} from '../schemas/transmission-type.schema';
import { TestDataSafetyService } from '../../common/services/test-data-safety.service';
import { SafeTestDataManagerService } from '../../common/services/safe-test-data-manager.service';
import {
  TestDataSafe,
  AuditDatabaseOperations,
  ValidateEnvironment,
} from '../../common/decorators/test-data-safety.decorators';
import { FeaturePackage } from '../../vehicles/enum/vehicle.type';

@Injectable()
export class SafeVehicleVariantSeedService {
  private readonly logger = new Logger(SafeVehicleVariantSeedService.name);

  constructor(
    @InjectModel(VehicleVariant.name)
    private readonly vehicleVariantModel: Model<VehicleVariantDocument>,
    @InjectModel(VehicleModel.name)
    private readonly vehicleModelModel: Model<VehicleModelDocument>,
    @InjectModel(FuelType.name)
    private readonly fuelTypeModel: Model<FuelTypeDocument>,
    @InjectModel(TransmissionType.name)
    private readonly transmissionTypeModel: Model<TransmissionTypeDocument>,
    private readonly testDataSafetyService: TestDataSafetyService,
    private readonly safeTestDataManager: SafeTestDataManagerService,
  ) {}

  private colors = ['White', 'Black', 'Silver', 'Red', 'Blue', 'Grey', 'Green'];

  private pick<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    const out: T[] = [];
    while (out.length < n && copy.length) {
      const idx = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  }

  private deriveSpecs(fuelName: string): {
    engine: {
      capacity: number;
      maxPower: number;
      maxTorque: number;
      cylinders?: number;
      turbocharged?: boolean;
    };
    perf: {
      mileage: number;
      acceleration?: number;
      topSpeed?: number;
      fuelCapacity?: number;
    };
  } {
    const lower = fuelName.toLowerCase();
    if (lower.includes('electric')) {
      return {
        engine: { capacity: 0, maxPower: 140, maxTorque: 250 },
        perf: {
          mileage: 7,
          acceleration: 8.5,
          topSpeed: 160,
          fuelCapacity: 50,
        }, // mileage as km/kWh proxy
      };
    }
    if (lower.includes('diesel')) {
      return {
        engine: {
          capacity: 1497,
          maxPower: 115,
          maxTorque: 250,
          cylinders: 4,
          turbocharged: true,
        },
        perf: {
          mileage: 20,
          acceleration: 11.5,
          topSpeed: 175,
          fuelCapacity: 45,
        },
      };
    }
    if (lower.includes('cng')) {
      return {
        engine: { capacity: 1197, maxPower: 75, maxTorque: 110, cylinders: 4 },
        perf: {
          mileage: 28,
          acceleration: 15.0,
          topSpeed: 150,
          fuelCapacity: 60,
        },
      };
    }
    if (lower.includes('hybrid') || lower.includes('plug')) {
      return {
        engine: { capacity: 1498, maxPower: 126, maxTorque: 170, cylinders: 4 },
        perf: {
          mileage: 24,
          acceleration: 10.5,
          topSpeed: 170,
          fuelCapacity: 40,
        },
      };
    }
    // petrol default
    return {
      engine: { capacity: 1199, maxPower: 88, maxTorque: 115, cylinders: 4 },
      perf: {
        mileage: 18,
        acceleration: 12.5,
        topSpeed: 165,
        fuelCapacity: 37,
      },
    };
  }

  @TestDataSafe({
    collection: 'vehiclevariants',
    prefix: 'Seed',
    requireTestDataMarkers: true,
    allowHardDelete: false,
  })
  @AuditDatabaseOperations()
  @ValidateEnvironment()
  async seedVehicleVariants(): Promise<void> {
    this.logger.log('🚙 Starting safe vehicle variants seeding...');
    this.testDataSafetyService.validateEnvironmentForDestructiveOperation(
      'seed vehicle variants',
    );

    // Load base data
    const [models, fuels, transmissions] = await Promise.all([
      this.vehicleModelModel
        .find({ isDeleted: { $ne: true }, isActive: true })
        .exec(),
      this.fuelTypeModel
        .find({ isDeleted: { $ne: true }, isActive: true })
        .exec(),
      this.transmissionTypeModel
        .find({ isDeleted: { $ne: true }, isActive: true })
        .exec(),
    ]);

    if (!models.length) {
      this.logger.warn('No vehicle models found. Seed models first.');
      return;
    }
    if (!fuels.length || !transmissions.length) {
      this.logger.warn(
        'Fuel types or Transmission types missing. Seed them first.',
      );
      return;
    }

    const createdIds: string[] = [];
    let created = 0;
    let reused = 0;
    let failed = 0;

    // For each model, create 5 variants combining fuel/transmission realistically
    for (const model of models) {
      // Choose realistic fuels (prefer petrol/diesel for ICE, electric for EV models)
      const fuelPool = fuels;
      const transPool = transmissions;
      const pickedFuels = this.pick(fuelPool, Math.min(3, fuelPool.length));
      const pickedTrans = this.pick(transPool, Math.min(3, transPool.length));

      // Generate up to 5 variants per model
      let producedForModel = 0;
      for (const f of pickedFuels) {
        for (const t of pickedTrans) {
          if (producedForModel >= 5) break;
          try {
            const exists = await this.vehicleVariantModel
              .findOne({
                vehicleModel: model._id,
                fuelType: f._id,
                transmissionType: t._id,
                featurePackage: FeaturePackage.BASE,
              })
              .exec();
            if (exists) {
              reused++;
              createdIds.push((exists._id as any).toString());
              continue;
            }

            const specs = this.deriveSpecs(f.name);
            const priceBase = 500000 + Math.floor(Math.random() * 1500000);
            const colors = this.pick(this.colors, 4);

            const payload: Partial<VehicleVariant> = {
              name: `${model.name}_${f.name}_${t.name}`.toLowerCase(),
              displayName: `${model.displayName} ${f.displayName} ${t.displayName}`,
              vehicleModel: new Types.ObjectId(
                (model._id as unknown as any).toString(),
              ),
              fuelType: new Types.ObjectId(
                (f._id as unknown as any).toString(),
              ),
              transmissionType: new Types.ObjectId(
                (t._id as unknown as any).toString(),
              ),
              featurePackage: FeaturePackage.BASE,
              engineSpecs: {
                capacity: specs.engine.capacity,
                maxPower: specs.engine.maxPower,
                maxTorque: specs.engine.maxTorque,
                cylinders: specs.engine.cylinders,
                turbocharged: specs.engine.turbocharged,
              },
              performanceSpecs: {
                mileage: specs.perf.mileage,
                acceleration: specs.perf.acceleration,
                topSpeed: specs.perf.topSpeed,
                fuelCapacity: specs.perf.fuelCapacity,
              },
              seatingCapacity: model?.defaultSeatingCapacity ?? 5,
              price: priceBase,
              exShowroomPrice: priceBase,
              onRoadPrice: Math.floor(priceBase * 1.12),
              colors,
              isActive: true,
              isLaunched: true,
            } as any;

            const safeData = this.safeTestDataManager.createTestDataWithMarkers(
              payload,
              'Seed',
            );
            const doc = new this.vehicleVariantModel(safeData);
            const saved = await doc.save();
            createdIds.push((saved._id as any).toString());
            created++;
            producedForModel++;
          } catch (e: any) {
            failed++;
            this.logger.error(
              `❌ Failed to create variant for model ${model.displayName}: ${e.message}`,
            );
          }
          if (producedForModel >= 5) break;
        }
      }
    }

    this.safeTestDataManager.registerTestData(
      'vehiclevariants',
      createdIds,
      'Seed',
    );
    this.logger.log(
      `📊 Vehicle variants seeding summary: ${created} created, ${reused} existing, ${failed} failed`,
    );
  }

  @TestDataSafe({
    collection: 'vehiclevariants',
    prefix: 'Seed',
    requireTestDataMarkers: true,
    allowHardDelete: true,
  })
  @AuditDatabaseOperations()
  @ValidateEnvironment()
  async cleanupSeededVehicleVariants(): Promise<{ deletedCount: number }> {
    this.logger.log('🧹 Cleaning up seeded vehicle variants...');
    const result = await this.safeTestDataManager.safeCleanupTestData(
      'vehiclevariants',
      this.vehicleVariantModel,
    );
    this.logger.log(`✅ Removed ${result.deletedCount} vehicle variants`);
    return result as any;
  }

  async getSeededVehicleVariantCount(): Promise<number> {
    return this.safeTestDataManager.getTestDataCount(
      'vehiclevariants',
      this.vehicleVariantModel,
    );
  }

  async listSeededVehicleVariants(): Promise<VehicleVariantDocument[]> {
    const filter =
      this.safeTestDataManager.createSafeTestDataFilter('vehiclevariants');
    return this.vehicleVariantModel.find(filter).exec();
  }

  async validateVehicleVariantIntegrity(): Promise<boolean> {
    const models = await this.vehicleModelModel
      .find({ isDeleted: { $ne: true }, isActive: true })
      .exec();
    const expectedPerModel = 5;
    const expectedMin = Math.floor(models.length * expectedPerModel * 0.7);
    const actual = await this.getSeededVehicleVariantCount();
    if (actual < expectedMin) {
      this.logger.error(
        `🚨 Vehicle variant integrity failed: expected at least ${expectedMin}, actual ${actual}`,
      );
      return false;
    }
    this.logger.log(`✅ Vehicle variant integrity ok: ${actual} variants`);
    return true;
  }
}
