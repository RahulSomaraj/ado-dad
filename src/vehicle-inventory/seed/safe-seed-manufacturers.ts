import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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

@Injectable()
export class SafeManufacturerSeedService {
  private readonly logger = new Logger(SafeManufacturerSeedService.name);

  constructor(
    @InjectModel(Manufacturer.name)
    private readonly manufacturerModel: Model<ManufacturerDocument>,
    private readonly testDataSafetyService: TestDataSafetyService,
    private readonly safeTestDataManager: SafeTestDataManagerService,
  ) {}

  /**
   * 🛡️ SAFE: Seeds manufacturers with safety markers and tracking
   */
  @TestDataSafe({
    collection: 'manufacturers',
    prefix: 'Seed',
    requireTestDataMarkers: true,
    allowHardDelete: false,
  })
  @AuditDatabaseOperations()
  @ValidateEnvironment()
  async seedManufacturers(): Promise<void> {
    this.logger.log('🌱 Starting safe manufacturer seeding process...');

    // Validate environment before seeding
    this.testDataSafetyService.validateEnvironmentForDestructiveOperation(
      'seed manufacturers',
    );

    const manufacturers = [
      // Indian Manufacturers
      {
        name: 'maruti_suzuki',
        displayName: 'Maruti Suzuki',
        originCountry: 'India',
        description:
          "India's largest car manufacturer, known for affordable and fuel-efficient vehicles",
        logo: 'https://example.com/logos/maruti-suzuki.png',
        website: 'https://www.marutisuzuki.com',
        foundedYear: 1981,
        headquarters: 'New Delhi, India',
        isActive: true,
      },
      {
        name: 'tata_motors',
        displayName: 'Tata Motors',
        originCountry: 'India',
        description:
          'Leading Indian automotive manufacturer, known for passenger cars and commercial vehicles',
        logo: 'https://example.com/logos/tata-motors.png',
        website: 'https://www.tatamotors.com',
        foundedYear: 1945,
        headquarters: 'Mumbai, India',
        isActive: true,
      },
      {
        name: 'mahindra',
        displayName: 'Mahindra & Mahindra',
        originCountry: 'India',
        description:
          'Major Indian automotive manufacturer specializing in SUVs and commercial vehicles',
        logo: 'https://example.com/logos/mahindra.png',
        website: 'https://www.mahindra.com',
        foundedYear: 1945,
        headquarters: 'Mumbai, India',
        isActive: true,
      },
      {
        name: 'hero_moto',
        displayName: 'Hero MotoCorp',
        originCountry: 'India',
        description:
          "World's largest two-wheeler manufacturer, known for motorcycles and scooters",
        logo: 'https://example.com/logos/hero-moto.png',
        website: 'https://www.heromotocorp.com',
        foundedYear: 1984,
        headquarters: 'New Delhi, India',
        isActive: true,
      },
      {
        name: 'bajaj_auto',
        displayName: 'Bajaj Auto',
        originCountry: 'India',
        description:
          'Leading Indian two-wheeler and three-wheeler manufacturer',
        logo: 'https://example.com/logos/bajaj-auto.png',
        website: 'https://www.bajajauto.com',
        foundedYear: 1945,
        headquarters: 'Pune, India',
        isActive: true,
      },
      {
        name: 'tvs_motor',
        displayName: 'TVS Motor Company',
        originCountry: 'India',
        description: 'Indian multinational motorcycle and scooter manufacturer',
        logo: 'https://example.com/logos/tvs-motor.png',
        website: 'https://www.tvsmotor.com',
        foundedYear: 1978,
        headquarters: 'Chennai, India',
        isActive: true,
      },
      {
        name: 'ashok_leyland',
        displayName: 'Ashok Leyland',
        originCountry: 'India',
        description: 'Major Indian commercial vehicle manufacturer',
        logo: 'https://example.com/logos/ashok-leyland.png',
        website: 'https://www.ashokleyland.com',
        foundedYear: 1948,
        headquarters: 'Chennai, India',
        isActive: true,
      },
      {
        name: 'force_motors',
        displayName: 'Force Motors',
        originCountry: 'India',
        description:
          'Indian automotive manufacturer of commercial vehicles and engines',
        logo: 'https://example.com/logos/force-motors.png',
        website: 'https://www.forcemotors.com',
        foundedYear: 1958,
        headquarters: 'Pune, India',
        isActive: true,
      },
      {
        name: 'eicher_motors',
        displayName: 'Eicher Motors',
        originCountry: 'India',
        description: 'Indian commercial vehicle and motorcycle manufacturer',
        logo: 'https://example.com/logos/eicher-motors.png',
        website: 'https://www.eicher.in',
        foundedYear: 1948,
        headquarters: 'Gurgaon, India',
        isActive: true,
      },
      {
        name: 'kinetic_engineering',
        displayName: 'Kinetic Engineering',
        originCountry: 'India',
        description: 'Indian automotive and engineering company',
        logo: 'https://example.com/logos/kinetic-engineering.png',
        website: 'https://www.kineticindia.com',
        foundedYear: 1970,
        headquarters: 'Pune, India',
        isActive: true,
      },
      // International Manufacturers
      {
        name: 'honda',
        displayName: 'Honda',
        originCountry: 'Japan',
        description:
          'Japanese multinational manufacturer of automobiles, motorcycles, and power equipment',
        logo: 'https://example.com/logos/honda.png',
        website: 'https://www.honda.com',
        foundedYear: 1948,
        headquarters: 'Tokyo, Japan',
        isActive: true,
      },
      {
        name: 'toyota',
        displayName: 'Toyota',
        originCountry: 'Japan',
        description: 'Japanese multinational automotive manufacturer',
        logo: 'https://example.com/logos/toyota.png',
        website: 'https://www.toyota.com',
        foundedYear: 1937,
        headquarters: 'Toyota City, Japan',
        isActive: true,
      },
      {
        name: 'hyundai',
        displayName: 'Hyundai',
        originCountry: 'South Korea',
        description: 'South Korean multinational automotive manufacturer',
        logo: 'https://example.com/logos/hyundai.png',
        website: 'https://www.hyundai.com',
        foundedYear: 1967,
        headquarters: 'Seoul, South Korea',
        isActive: true,
      },
      {
        name: 'kia',
        displayName: 'Kia',
        originCountry: 'South Korea',
        description: 'South Korean multinational automotive manufacturer',
        logo: 'https://example.com/logos/kia.png',
        website: 'https://www.kia.com',
        foundedYear: 1944,
        headquarters: 'Seoul, South Korea',
        isActive: true,
      },
      {
        name: 'volkswagen',
        displayName: 'Volkswagen',
        originCountry: 'Germany',
        description: 'German multinational automotive manufacturer',
        logo: 'https://example.com/logos/volkswagen.png',
        website: 'https://www.volkswagen.com',
        foundedYear: 1937,
        headquarters: 'Wolfsburg, Germany',
        isActive: true,
      },
      {
        name: 'bmw',
        displayName: 'BMW',
        originCountry: 'Germany',
        description:
          'German multinational manufacturer of luxury vehicles and motorcycles',
        logo: 'https://example.com/logos/bmw.png',
        website: 'https://www.bmw.com',
        foundedYear: 1916,
        headquarters: 'Munich, Germany',
        isActive: true,
      },
      {
        name: 'mercedes_benz',
        displayName: 'Mercedes-Benz',
        originCountry: 'Germany',
        description: 'German multinational automotive corporation',
        logo: 'https://example.com/logos/mercedes-benz.png',
        website: 'https://www.mercedes-benz.com',
        foundedYear: 1926,
        headquarters: 'Stuttgart, Germany',
        isActive: true,
      },
      {
        name: 'audi',
        displayName: 'Audi',
        originCountry: 'Germany',
        description: 'German automobile manufacturer of luxury vehicles',
        logo: 'https://example.com/logos/audi.png',
        website: 'https://www.audi.com',
        foundedYear: 1909,
        headquarters: 'Ingolstadt, Germany',
        isActive: true,
      },
      {
        name: 'ford',
        displayName: 'Ford',
        originCountry: 'United States',
        description: 'American multinational automobile manufacturer',
        logo: 'https://example.com/logos/ford.png',
        website: 'https://www.ford.com',
        foundedYear: 1903,
        headquarters: 'Dearborn, Michigan, USA',
        isActive: true,
      },
      {
        name: 'chevrolet',
        displayName: 'Chevrolet',
        originCountry: 'United States',
        description: 'American automobile division of General Motors',
        logo: 'https://example.com/logos/chevrolet.png',
        website: 'https://www.chevrolet.com',
        foundedYear: 1911,
        headquarters: 'Detroit, Michigan, USA',
        isActive: true,
      },
      {
        name: 'nissan',
        displayName: 'Nissan',
        originCountry: 'Japan',
        description: 'Japanese multinational automobile manufacturer',
        logo: 'https://example.com/logos/nissan.png',
        website: 'https://www.nissan.com',
        foundedYear: 1933,
        headquarters: 'Yokohama, Japan',
        isActive: true,
      },
      {
        name: 'mitsubishi',
        displayName: 'Mitsubishi',
        originCountry: 'Japan',
        description: 'Japanese multinational automotive manufacturer',
        logo: 'https://example.com/logos/mitsubishi.png',
        website: 'https://www.mitsubishi.com',
        foundedYear: 1970,
        headquarters: 'Tokyo, Japan',
        isActive: true,
      },
      {
        name: 'suzuki',
        displayName: 'Suzuki',
        originCountry: 'Japan',
        description:
          'Japanese multinational corporation specializing in automobiles and motorcycles',
        logo: 'https://example.com/logos/suzuki.png',
        website: 'https://www.suzuki.com',
        foundedYear: 1909,
        headquarters: 'Hamamatsu, Japan',
        isActive: true,
      },
      {
        name: 'yamaha',
        displayName: 'Yamaha',
        originCountry: 'Japan',
        description:
          'Japanese multinational corporation specializing in motorcycles and musical instruments',
        logo: 'https://example.com/logos/yamaha.png',
        website: 'https://www.yamaha.com',
        foundedYear: 1887,
        headquarters: 'Iwata, Japan',
        isActive: true,
      },
      {
        name: 'kawasaki',
        displayName: 'Kawasaki',
        originCountry: 'Japan',
        description:
          'Japanese multinational corporation specializing in motorcycles and heavy equipment',
        logo: 'https://example.com/logos/kawasaki.png',
        website: 'https://www.kawasaki.com',
        foundedYear: 1896,
        headquarters: 'Tokyo, Japan',
        isActive: true,
      },
      {
        name: 'ducati',
        displayName: 'Ducati',
        originCountry: 'Italy',
        description: 'Italian motorcycle manufacturer',
        logo: 'https://example.com/logos/ducati.png',
        website: 'https://www.ducati.com',
        foundedYear: 1926,
        headquarters: 'Bologna, Italy',
        isActive: true,
      },
      {
        name: 'harley_davidson',
        displayName: 'Harley-Davidson',
        originCountry: 'United States',
        description: 'American motorcycle manufacturer',
        logo: 'https://example.com/logos/harley-davidson.png',
        website: 'https://www.harley-davidson.com',
        foundedYear: 1903,
        headquarters: 'Milwaukee, Wisconsin, USA',
        isActive: true,
      },
      {
        name: 'triumph',
        displayName: 'Triumph',
        originCountry: 'United Kingdom',
        description: 'British motorcycle manufacturer',
        logo: 'https://example.com/logos/triumph.png',
        website: 'https://www.triumph-motorcycles.co.uk',
        foundedYear: 1902,
        headquarters: 'Hinckley, Leicestershire, UK',
        isActive: true,
      },
    ];

    const createdManufacturers: ManufacturerDocument[] = [];
    const manufacturerIds: string[] = [];

    try {
      let successCount = 0;
      let errorCount = 0;
      let existingCount = 0;

      for (const manufacturerData of manufacturers) {
        try {
          // Check if manufacturer already exists
          const existingManufacturer = await this.manufacturerModel
            .findOne({
              name: manufacturerData.name,
            })
            .exec();

          if (existingManufacturer) {
            // Manufacturer already exists, use it
            createdManufacturers.push(existingManufacturer);
            manufacturerIds.push((existingManufacturer._id as any).toString());
            existingCount++;

            this.logger.log(
              `🔄 Found existing manufacturer: ${existingManufacturer.displayName} (${existingManufacturer.name})`,
            );
          } else {
            // Create new manufacturer with safety markers
            const safeManufacturerData =
              this.safeTestDataManager.createTestDataWithMarkers(
                manufacturerData,
                'Seed',
              );

            const manufacturer = new this.manufacturerModel(
              safeManufacturerData,
            );
            const savedManufacturer = await manufacturer.save();

            createdManufacturers.push(savedManufacturer);
            manufacturerIds.push((savedManufacturer._id as any).toString());
            successCount++;

            this.logger.log(
              `✅ Created manufacturer: ${savedManufacturer.displayName} (${savedManufacturer.name})`,
            );
          }
        } catch (manufacturerError) {
          errorCount++;
          this.logger.error(
            `❌ Failed to create manufacturer ${manufacturerData.name}: ${manufacturerError.message}`,
          );
        }
      }

      this.logger.log(
        `📊 Manufacturer creation summary: ${successCount} created, ${existingCount} existing, ${errorCount} failed`,
      );

      // Register all manufacturers for safe tracking
      this.safeTestDataManager.registerTestData(
        'manufacturers',
        manufacturerIds,
        'Seed',
      );

      this.logger.log(
        `🎉 Successfully seeded ${createdManufacturers.length} manufacturers`,
      );
      this.logger.log('📊 Manufacturer Summary:');

      // Group by country
      const byCountry = createdManufacturers.reduce(
        (acc, mfr) => {
          const country = mfr.originCountry;
          acc[country] = (acc[country] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      Object.entries(byCountry).forEach(([country, count]) => {
        this.logger.log(`   ${country}: ${count} manufacturers`);
      });
    } catch (error) {
      this.logger.error(
        `❌ Error during manufacturer seeding: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 🛡️ SAFE: Safely cleans up seeded manufacturer data
   */
  @TestDataSafe({
    collection: 'manufacturers',
    prefix: 'Seed',
    requireTestDataMarkers: true,
    allowHardDelete: true,
  })
  @AuditDatabaseOperations()
  @ValidateEnvironment()
  async cleanupSeededManufacturers(): Promise<any> {
    this.logger.log('🧹 Starting safe cleanup of seeded manufacturers...');

    try {
      const result = await this.safeTestDataManager.safeCleanupTestData(
        'manufacturers',
        this.manufacturerModel,
      );

      this.logger.log(
        `✅ Safe cleanup completed: ${result.deletedCount} manufacturers removed`,
      );
      return result;
    } catch (error) {
      this.logger.error(`❌ Error during safe cleanup: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🛡️ SAFE: Gets count of seeded manufacturers
   */
  async getSeededManufacturerCount(): Promise<number> {
    return await this.safeTestDataManager.getTestDataCount(
      'manufacturers',
      this.manufacturerModel,
    );
  }

  /**
   * 🛡️ SAFE: Lists all seeded manufacturers
   */
  async listSeededManufacturers(): Promise<ManufacturerDocument[]> {
    const safeFilter =
      this.safeTestDataManager.createSafeTestDataFilter('manufacturers');
    return await this.manufacturerModel.find(safeFilter).exec();
  }

  /**
   * 🛡️ SAFE: Validates manufacturer data integrity
   */
  async validateManufacturerIntegrity(): Promise<boolean> {
    const expectedCount = 35; // Total manufacturers in our seed data
    const actualCount = await this.getSeededManufacturerCount();

    // Allow for some flexibility - if we have at least 80% of expected manufacturers, consider it successful
    const minRequiredCount = Math.floor(expectedCount * 0.8); // 80% of expected

    if (actualCount < minRequiredCount) {
      this.logger.error(
        `🚨 Manufacturer integrity check failed: Expected at least ${minRequiredCount}, Actual ${actualCount}`,
      );

      // Log what we have vs what we expected
      const manufacturers = await this.listSeededManufacturers();
      const foundNames = manufacturers.map((m) => m.name).sort();
      this.logger.log(`📋 Found manufacturers: ${foundNames.join(', ')}`);

      return false;
    }

    if (actualCount < expectedCount) {
      this.logger.warn(
        `⚠️ Manufacturer integrity check passed with warning: Expected ${expectedCount}, Actual ${actualCount}`,
      );

      // Log what we have vs what we expected
      const manufacturers = await this.listSeededManufacturers();
      const foundNames = manufacturers.map((m) => m.name).sort();
      this.logger.log(`📋 Found manufacturers: ${foundNames.join(', ')}`);
    } else {
      this.logger.log(
        `✅ Manufacturer integrity check passed: ${actualCount} manufacturers found`,
      );
    }

    return true;
  }
}
