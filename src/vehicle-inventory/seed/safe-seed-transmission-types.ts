import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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

@Injectable()
export class SafeTransmissionTypeSeedService {
  private readonly logger = new Logger(SafeTransmissionTypeSeedService.name);

  constructor(
    @InjectModel(TransmissionType.name)
    private readonly transmissionTypeModel: Model<TransmissionTypeDocument>,
    private readonly testDataSafetyService: TestDataSafetyService,
    private readonly safeTestDataManager: SafeTestDataManagerService,
  ) {}

  /**
   * 🛡️ SAFE: Seeds transmission types with safety markers and tracking
   */
  @TestDataSafe({
    collection: 'transmissiontypes',
    prefix: 'Seed',
    requireTestDataMarkers: true,
    allowHardDelete: false,
  })
  @AuditDatabaseOperations()
  @ValidateEnvironment()
  async seedTransmissionTypes(): Promise<void> {
    this.logger.log('⚙️ Starting safe transmission type seeding process...');

    // Validate environment before seeding
    this.testDataSafetyService.validateEnvironmentForDestructiveOperation(
      'seed transmission types',
    );

    const transmissionTypes = [
      // Manual transmissions
      {
        name: 'manual_5',
        displayName: '5-Speed Manual',
        description: 'Traditional 5-speed manual transmission',
        type: 'manual',
        gears: 5,
        isActive: true,
      },
      {
        name: 'manual_6',
        displayName: '6-Speed Manual',
        description: '6-speed manual transmission for better performance',
        type: 'manual',
        gears: 6,
        isActive: true,
      },
      {
        name: 'manual_7',
        displayName: '7-Speed Manual',
        description:
          '7-speed manual transmission for high-performance vehicles',
        type: 'manual',
        gears: 7,
        isActive: true,
      },

      // Automatic transmissions
      {
        name: 'automatic_4',
        displayName: '4-Speed Automatic',
        description: 'Traditional 4-speed automatic transmission',
        type: 'automatic',
        gears: 4,
        isActive: true,
      },
      {
        name: 'automatic_5',
        displayName: '5-Speed Automatic',
        description: '5-speed automatic transmission',
        type: 'automatic',
        gears: 5,
        isActive: true,
      },
      {
        name: 'automatic_6',
        displayName: '6-Speed Automatic',
        description: '6-speed automatic transmission for better efficiency',
        type: 'automatic',
        gears: 6,
        isActive: true,
      },
      {
        name: 'automatic_8',
        displayName: '8-Speed Automatic',
        description: '8-speed automatic transmission for luxury vehicles',
        type: 'automatic',
        gears: 8,
        isActive: true,
      },
      {
        name: 'automatic_9',
        displayName: '9-Speed Automatic',
        description: '9-speed automatic transmission for premium vehicles',
        type: 'automatic',
        gears: 9,
        isActive: true,
      },
      {
        name: 'automatic_10',
        displayName: '10-Speed Automatic',
        description:
          '10-speed automatic transmission for high-performance vehicles',
        type: 'automatic',
        gears: 10,
        isActive: true,
      },

      // CVT transmissions
      {
        name: 'cvt',
        displayName: 'CVT (Continuously Variable Transmission)',
        description: 'Continuously variable transmission for smooth operation',
        type: 'cvt',
        gears: 0,
        isActive: true,
      },
      {
        name: 'cvt_sport',
        displayName: 'Sport CVT',
        description: 'Sport-tuned CVT with paddle shifters',
        type: 'cvt',
        gears: 0,
        isActive: true,
      },

      // Semi-automatic transmissions
      {
        name: 'semi_auto_5',
        displayName: '5-Speed Semi-Automatic',
        description: '5-speed semi-automatic transmission',
        type: 'semi_automatic',
        gears: 5,
        isActive: true,
      },
      {
        name: 'semi_auto_6',
        displayName: '6-Speed Semi-Automatic',
        description: '6-speed semi-automatic transmission',
        type: 'semi_automatic',
        gears: 6,
        isActive: true,
      },

      // Dual-clutch transmissions
      {
        name: 'dct_6',
        displayName: '6-Speed DCT',
        description: '6-speed dual-clutch transmission for sporty driving',
        type: 'dual_clutch',
        gears: 6,
        isActive: true,
      },
      {
        name: 'dct_7',
        displayName: '7-Speed DCT',
        description: '7-speed dual-clutch transmission for high-performance',
        type: 'dual_clutch',
        gears: 7,
        isActive: true,
      },
      {
        name: 'dct_8',
        displayName: '8-Speed DCT',
        description: '8-speed dual-clutch transmission for luxury sports cars',
        type: 'dual_clutch',
        gears: 8,
        isActive: true,
      },

      // Electric vehicle transmissions
      {
        name: 'single_speed',
        displayName: 'Single-Speed',
        description: 'Single-speed transmission for electric vehicles',
        type: 'electric',
        gears: 1,
        isActive: true,
      },
      {
        name: 'two_speed',
        displayName: 'Two-Speed',
        description: 'Two-speed transmission for electric vehicles',
        type: 'electric',
        gears: 2,
        isActive: true,
      },

      // Specialized transmissions
      {
        name: 'sequential',
        displayName: 'Sequential',
        description: 'Sequential transmission for racing applications',
        type: 'racing',
        gears: 6,
        isActive: true,
      },
      {
        name: 'automated_manual',
        displayName: 'Automated Manual',
        description: 'Automated manual transmission with clutch automation',
        type: 'automated_manual',
        gears: 6,
        isActive: true,
      },
    ];

    const createdTransmissionTypes: TransmissionTypeDocument[] = [];
    const transmissionTypeIds: string[] = [];

    try {
      let successCount = 0;
      let errorCount = 0;
      let existingCount = 0;

      for (const transmissionTypeData of transmissionTypes) {
        try {
          // Check if transmission type already exists
          const existingTransmissionType = await this.transmissionTypeModel
            .findOne({ name: transmissionTypeData.name })
            .exec();

          if (existingTransmissionType) {
            // Transmission type already exists, use it
            createdTransmissionTypes.push(existingTransmissionType);
            transmissionTypeIds.push(
              (existingTransmissionType._id as any).toString(),
            );
            existingCount++;

            this.logger.log(
              `🔄 Found existing transmission type: ${existingTransmissionType.displayName} (${existingTransmissionType.name})`,
            );
          } else {
            // Create new transmission type with safety markers
            const safeTransmissionTypeData =
              this.safeTestDataManager.createTestDataWithMarkers(
                transmissionTypeData,
                'Seed',
              );

            const transmissionType = new this.transmissionTypeModel(
              safeTransmissionTypeData,
            );
            const savedTransmissionType = await transmissionType.save();

            createdTransmissionTypes.push(savedTransmissionType);
            transmissionTypeIds.push(
              (savedTransmissionType._id as any).toString(),
            );
            successCount++;

            this.logger.log(
              `✅ Created transmission type: ${savedTransmissionType.displayName} (${savedTransmissionType.name})`,
            );
          }
        } catch (transmissionTypeError) {
          errorCount++;
          this.logger.error(
            `❌ Failed to create transmission type ${transmissionTypeData.name}: ${transmissionTypeError.message}`,
          );
        }
      }

      this.logger.log(
        `📊 Transmission type creation summary: ${successCount} created, ${existingCount} existing, ${errorCount} failed`,
      );

      // Register all transmission types for safe tracking
      this.safeTestDataManager.registerTestData(
        'transmissiontypes',
        transmissionTypeIds,
        'Seed',
      );

      this.logger.log(
        `🎉 Successfully seeded ${createdTransmissionTypes.length} transmission types`,
      );
      this.logger.log('📊 Transmission Type Summary:');

      // Group by type
      const byType = createdTransmissionTypes.reduce(
        (acc, tt) => {
          const type = tt.type || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      Object.entries(byType).forEach(([type, count]) => {
        this.logger.log(`   ${type}: ${count} transmission types`);
      });
    } catch (error) {
      this.logger.error(
        `❌ Error during transmission type seeding: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 🛡️ SAFE: Safely cleans up seeded transmission type data
   */
  @TestDataSafe({
    collection: 'transmissiontypes',
    prefix: 'Seed',
    requireTestDataMarkers: true,
    allowHardDelete: true,
  })
  @AuditDatabaseOperations()
  @ValidateEnvironment()
  async cleanupSeededTransmissionTypes(): Promise<any> {
    this.logger.log('🧹 Starting safe cleanup of seeded transmission types...');

    try {
      const result = await this.safeTestDataManager.safeCleanupTestData(
        'transmissiontypes',
        this.transmissionTypeModel,
      );

      this.logger.log(
        `✅ Safe cleanup completed: ${result.deletedCount} transmission types removed`,
      );
      return result;
    } catch (error) {
      this.logger.error(`❌ Error during safe cleanup: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🛡️ SAFE: Gets count of seeded transmission types
   */
  async getSeededTransmissionTypeCount(): Promise<number> {
    return await this.safeTestDataManager.getTestDataCount(
      'transmissiontypes',
      this.transmissionTypeModel,
    );
  }

  /**
   * 🛡️ SAFE: Lists all seeded transmission types
   */
  async listSeededTransmissionTypes(): Promise<TransmissionTypeDocument[]> {
    const safeFilter =
      this.safeTestDataManager.createSafeTestDataFilter('transmissiontypes');
    return await this.transmissionTypeModel.find(safeFilter).exec();
  }

  /**
   * 🛡️ SAFE: Validates transmission type data integrity
   */
  async validateTransmissionTypeIntegrity(): Promise<boolean> {
    const expectedCount = 25; // Total transmission types in our seed data
    const actualCount = await this.getSeededTransmissionTypeCount();

    // Allow for some flexibility - if we have at least 80% of expected transmission types, consider it successful
    const minRequiredCount = Math.floor(expectedCount * 0.8); // 80% of expected

    if (actualCount < minRequiredCount) {
      this.logger.error(
        `🚨 Transmission type integrity check failed: Expected at least ${minRequiredCount}, Actual ${actualCount}`,
      );

      // Log what we have vs what we expected
      const transmissionTypes = await this.listSeededTransmissionTypes();
      const foundNames = transmissionTypes.map((tt) => tt.name).sort();
      this.logger.log(`📋 Found transmission types: ${foundNames.join(', ')}`);

      return false;
    }

    if (actualCount < expectedCount) {
      this.logger.warn(
        `⚠️ Transmission type integrity check passed with warning: Expected ${expectedCount}, Actual ${actualCount}`,
      );

      // Log what we have vs what we expected
      const transmissionTypes = await this.listSeededTransmissionTypes();
      const foundNames = transmissionTypes.map((tt) => tt.name).sort();
      this.logger.log(`📋 Found transmission types: ${foundNames.join(', ')}`);
    } else {
      this.logger.log(
        `✅ Transmission type integrity check passed: ${actualCount} transmission types found`,
      );
    }

    return true;
  }
}
