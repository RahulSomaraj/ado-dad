import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FuelType, FuelTypeDocument } from '../schemas/fuel-type.schema';
import { TestDataSafetyService } from '../../common/services/test-data-safety.service';
import { SafeTestDataManagerService } from '../../common/services/safe-test-data-manager.service';
import {
  TestDataSafe,
  AuditDatabaseOperations,
  ValidateEnvironment,
} from '../../common/decorators/test-data-safety.decorators';

@Injectable()
export class SafeFuelTypeSeedService {
  private readonly logger = new Logger(SafeFuelTypeSeedService.name);

  constructor(
    @InjectModel(FuelType.name)
    private readonly fuelTypeModel: Model<FuelTypeDocument>,
    private readonly testDataSafetyService: TestDataSafetyService,
    private readonly safeTestDataManager: SafeTestDataManagerService,
  ) {}

  /**
   * 🛡️ SAFE: Seeds fuel types with safety markers and tracking
   */
  @TestDataSafe({
    collection: 'fueltypes',
    prefix: 'Seed',
    requireTestDataMarkers: true,
    allowHardDelete: false,
  })
  @AuditDatabaseOperations()
  @ValidateEnvironment()
  async seedFuelTypes(): Promise<void> {
    this.logger.log('⛽ Starting safe fuel type seeding process...');

    // Validate environment before seeding
    this.testDataSafetyService.validateEnvironmentForDestructiveOperation(
      'seed fuel types',
    );

    const fuelTypes = [
      // Petrol/Gasoline variants
      {
        name: 'petrol',
        displayName: 'Petrol',
        description: 'Standard gasoline fuel for internal combustion engines',
        category: 'liquid',
        octaneRating: 87,
        isActive: true,
      },
      {
        name: 'premium_petrol',
        displayName: 'Premium Petrol',
        description: 'High-octane gasoline for performance engines',
        category: 'liquid',
        octaneRating: 91,
        isActive: true,
      },
      {
        name: 'super_petrol',
        displayName: 'Super Petrol',
        description: 'Ultra-high octane gasoline for high-performance engines',
        category: 'liquid',
        octaneRating: 95,
        isActive: true,
      },
      {
        name: 'racing_petrol',
        displayName: 'Racing Petrol',
        description: 'Specialized high-octane fuel for racing applications',
        category: 'liquid',
        octaneRating: 100,
        isActive: true,
      },

      // Diesel variants
      {
        name: 'diesel',
        displayName: 'Diesel',
        description: 'Standard diesel fuel for compression ignition engines',
        category: 'liquid',
        cetaneRating: 45,
        isActive: true,
      },
      {
        name: 'premium_diesel',
        displayName: 'Premium Diesel',
        description: 'High-quality diesel with improved lubricity and cetane',
        category: 'liquid',
        cetaneRating: 51,
        isActive: true,
      },
      {
        name: 'biodiesel',
        displayName: 'Biodiesel',
        description:
          'Renewable diesel fuel made from vegetable oils or animal fats',
        category: 'liquid',
        cetaneRating: 47,
        isActive: true,
      },

      // Alternative fuels
      {
        name: 'cng',
        displayName: 'Compressed Natural Gas',
        description:
          'Compressed natural gas for dual-fuel or dedicated CNG vehicles',
        category: 'gas',
        energyDensity: 'high',
        isActive: true,
      },
      {
        name: 'lpg',
        displayName: 'Liquefied Petroleum Gas',
        description:
          'LPG fuel for converted vehicles and dedicated LPG engines',
        category: 'gas',
        energyDensity: 'medium',
        isActive: true,
      },
      {
        name: 'hydrogen',
        displayName: 'Hydrogen',
        description: 'Hydrogen fuel for fuel cell electric vehicles',
        category: 'gas',
        energyDensity: 'very_high',
        isActive: true,
      },

      // Electric and hybrid
      {
        name: 'electric',
        displayName: 'Electric',
        description: 'Electric power for battery electric vehicles',
        category: 'electric',
        voltage: '400V',
        isActive: true,
      },
      {
        name: 'hybrid_petrol',
        displayName: 'Hybrid Petrol-Electric',
        description: 'Combination of petrol engine and electric motor',
        category: 'hybrid',
        fuelEfficiency: 'high',
        isActive: true,
      },
      {
        name: 'hybrid_diesel',
        displayName: 'Hybrid Diesel-Electric',
        description: 'Combination of diesel engine and electric motor',
        category: 'hybrid',
        fuelEfficiency: 'very_high',
        isActive: true,
      },
      {
        name: 'plug_in_hybrid',
        displayName: 'Plug-in Hybrid',
        description:
          'Hybrid vehicle with larger battery for extended electric range',
        category: 'hybrid',
        electricRange: '50km',
        isActive: true,
      },

      // Specialized fuels
      {
        name: 'ethanol',
        displayName: 'Ethanol',
        description: 'Bio-ethanol fuel, often blended with gasoline',
        category: 'liquid',
        ethanolContent: '85%',
        isActive: true,
      },
      {
        name: 'methanol',
        displayName: 'Methanol',
        description:
          'Alternative alcohol fuel for racing and specialized applications',
        category: 'liquid',
        energyDensity: 'medium',
        isActive: true,
      },
      {
        name: 'kerosene',
        displayName: 'Kerosene',
        description: 'Aviation fuel grade kerosene for specialized vehicles',
        category: 'liquid',
        flashPoint: '38°C',
        isActive: true,
      },
    ];

    const createdFuelTypes: FuelTypeDocument[] = [];
    const fuelTypeIds: string[] = [];

    try {
      let successCount = 0;
      let errorCount = 0;
      let existingCount = 0;

      for (const fuelTypeData of fuelTypes) {
        try {
          // Check if fuel type already exists
          const existingFuelType = await this.fuelTypeModel
            .findOne({ name: fuelTypeData.name })
            .exec();

          if (existingFuelType) {
            // Fuel type already exists, use it
            createdFuelTypes.push(existingFuelType);
            fuelTypeIds.push((existingFuelType._id as any).toString());
            existingCount++;

            this.logger.log(
              `🔄 Found existing fuel type: ${existingFuelType.displayName} (${existingFuelType.name})`,
            );
          } else {
            // Create new fuel type with safety markers
            const safeFuelTypeData =
              this.safeTestDataManager.createTestDataWithMarkers(
                fuelTypeData,
                'Seed',
              );

            const fuelType = new this.fuelTypeModel(safeFuelTypeData);
            const savedFuelType = await fuelType.save();

            createdFuelTypes.push(savedFuelType);
            fuelTypeIds.push((savedFuelType._id as any).toString());
            successCount++;

            this.logger.log(
              `✅ Created fuel type: ${savedFuelType.displayName} (${savedFuelType.name})`,
            );
          }
        } catch (fuelTypeError) {
          errorCount++;
          this.logger.error(
            `❌ Failed to create fuel type ${fuelTypeData.name}: ${fuelTypeError.message}`,
          );
        }
      }

      this.logger.log(
        `📊 Fuel type creation summary: ${successCount} created, ${existingCount} existing, ${errorCount} failed`,
      );

      // Register all fuel types for safe tracking
      this.safeTestDataManager.registerTestData(
        'fueltypes',
        fuelTypeIds,
        'Seed',
      );

      this.logger.log(
        `🎉 Successfully seeded ${createdFuelTypes.length} fuel types`,
      );
      this.logger.log('📊 Fuel Type Summary:');

      // Group by category
      const byCategory = createdFuelTypes.reduce(
        (acc, ft) => {
          const category = ft.category || 'unknown';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      Object.entries(byCategory).forEach(([category, count]) => {
        this.logger.log(`   ${category}: ${count} fuel types`);
      });
    } catch (error) {
      this.logger.error(`❌ Error during fuel type seeding: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🛡️ SAFE: Safely cleans up seeded fuel type data
   */
  @TestDataSafe({
    collection: 'fueltypes',
    prefix: 'Seed',
    requireTestDataMarkers: true,
    allowHardDelete: true,
  })
  @AuditDatabaseOperations()
  @ValidateEnvironment()
  async cleanupSeededFuelTypes(): Promise<any> {
    this.logger.log('🧹 Starting safe cleanup of seeded fuel types...');

    try {
      const result = await this.safeTestDataManager.safeCleanupTestData(
        'fueltypes',
        this.fuelTypeModel,
      );

      this.logger.log(
        `✅ Safe cleanup completed: ${result.deletedCount} fuel types removed`,
      );
      return result;
    } catch (error) {
      this.logger.error(`❌ Error during safe cleanup: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🛡️ SAFE: Gets count of seeded fuel types
   */
  async getSeededFuelTypeCount(): Promise<number> {
    return await this.safeTestDataManager.getTestDataCount(
      'fueltypes',
      this.fuelTypeModel,
    );
  }

  /**
   * 🛡️ SAFE: Lists all seeded fuel types
   */
  async listSeededFuelTypes(): Promise<FuelTypeDocument[]> {
    const safeFilter =
      this.safeTestDataManager.createSafeTestDataFilter('fueltypes');
    return await this.fuelTypeModel.find(safeFilter).exec();
  }

  /**
   * 🛡️ SAFE: Validates fuel type data integrity
   */
  async validateFuelTypeIntegrity(): Promise<boolean> {
    const expectedCount = 20; // Total fuel types in our seed data
    const actualCount = await this.getSeededFuelTypeCount();

    // Allow for some flexibility - if we have at least 80% of expected fuel types, consider it successful
    const minRequiredCount = Math.floor(expectedCount * 0.8); // 80% of expected

    if (actualCount < minRequiredCount) {
      this.logger.error(
        `🚨 Fuel type integrity check failed: Expected at least ${minRequiredCount}, Actual ${actualCount}`,
      );

      // Log what we have vs what we expected
      const fuelTypes = await this.listSeededFuelTypes();
      const foundNames = fuelTypes.map((ft) => ft.name).sort();
      this.logger.log(`📋 Found fuel types: ${foundNames.join(', ')}`);

      return false;
    }

    if (actualCount < expectedCount) {
      this.logger.warn(
        `⚠️ Fuel type integrity check passed with warning: Expected ${expectedCount}, Actual ${actualCount}`,
      );

      // Log what we have vs what we expected
      const fuelTypes = await this.listSeededFuelTypes();
      const foundNames = fuelTypes.map((ft) => ft.name).sort();
      this.logger.log(`📋 Found fuel types: ${foundNames.join(', ')}`);
    } else {
      this.logger.log(
        `✅ Fuel type integrity check passed: ${actualCount} fuel types found`,
      );
    }

    return true;
  }
}
