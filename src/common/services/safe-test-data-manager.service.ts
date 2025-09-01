import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TestDataSafetyService } from './test-data-safety.service';

export interface TestDataRecord {
  collectionName: string;
  testDataIds: string[];
  testPrefix: string;
  createdAt: Date;
  testEnvironment: string;
}

@Injectable()
export class SafeTestDataManagerService {
  private readonly logger = new Logger(SafeTestDataManagerService.name);
  private testDataRegistry: Map<string, TestDataRecord> = new Map();

  constructor(private readonly testDataSafetyService: TestDataSafetyService) {}

  /**
   * 🛡️ SAFE: Registers test data for tracking and safe cleanup
   * @param collectionName - Name of the collection
   * @param testDataIds - Array of test data IDs
   * @param testPrefix - Prefix used for test data
   */
  registerTestData(
    collectionName: string,
    testDataIds: string[],
    testPrefix: string = 'Test',
  ): void {
    const validatedIds =
      this.testDataSafetyService.validateTestDataIds(testDataIds);

    const testDataRecord: TestDataRecord = {
      collectionName,
      testDataIds: validatedIds,
      testPrefix,
      createdAt: new Date(),
      testEnvironment: process.env.NODE_ENV || 'unknown',
    };

    this.testDataRegistry.set(collectionName, testDataRecord);

    this.logger.log(
      `📝 Registered ${validatedIds.length} test data records for collection: ${collectionName}` +
        `\n   Test Prefix: ${testPrefix}` +
        `\n   Environment: ${testDataRecord.testEnvironment}`,
    );
  }

  /**
   * 🛡️ SAFE: Creates test data with safety markers
   * @param data - The data to be created
   * @param testPrefix - Prefix for test data
   * @returns Data with test markers
   */
  createTestDataWithMarkers(data: any, testPrefix: string = 'Test'): any {
    const testMarker =
      this.testDataSafetyService.createTestDataMarker(testPrefix);

    return {
      ...data,
      ...testMarker,
      // Add timestamp for easy identification
      testCreatedAt: new Date(),
      // Add unique test identifier
      testId: `${testPrefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  /**
   * 🛡️ SAFE: Creates a safe filter that only targets test data
   * @param collectionName - Name of the collection
   * @param additionalFilter - Additional filter criteria
   * @returns Safe filter that only targets test data
   */
  createSafeTestDataFilter(
    collectionName: string,
    additionalFilter: any = {},
  ): any {
    const testDataRecord = this.testDataRegistry.get(collectionName);

    if (!testDataRecord) {
      this.logger.warn(
        `⚠️ No test data registered for collection: ${collectionName}`,
      );
      // Return a very restrictive filter to prevent accidental deletion
      return {
        ...additionalFilter,
        $and: [
          { isTestData: true },
          { testPrefix: { $exists: true } },
          { testId: { $exists: true } },
        ],
      };
    }

    // Create safe filter that only targets registered test data
    const safeFilter = {
      ...additionalFilter,
      $or: [
        { _id: { $in: testDataRecord.testDataIds } },
        { testId: { $regex: new RegExp(`^${testDataRecord.testPrefix}_`) } },
        { title: { $regex: new RegExp(`^${testDataRecord.testPrefix} `) } },
        {
          description: { $regex: new RegExp(`^${testDataRecord.testPrefix} `) },
        },
        {
          email: {
            $regex: new RegExp(`^${testDataRecord.testPrefix.toLowerCase()}-`),
          },
        },
        {
          username: {
            $regex: new RegExp(`^${testDataRecord.testPrefix.toLowerCase()}-`),
          },
        },
        {
          phone: {
            $regex: new RegExp(`^${testDataRecord.testPrefix.toLowerCase()}-`),
          },
        },
      ],
    };

    this.logger.debug(
      `🛡️ Safe filter created for ${collectionName}: ${JSON.stringify(safeFilter)}`,
    );

    return safeFilter;
  }

  /**
   * 🛡️ SAFE: Safely cleans up test data without affecting production data
   * @param collectionName - Name of the collection to clean
   * @param model - Mongoose model for the collection
   * @returns Result of the cleanup operation
   */
  async safeCleanupTestData<T>(
    collectionName: string,
    model: Model<T>,
  ): Promise<any> {
    this.testDataSafetyService.validateEnvironmentForDestructiveOperation(
      'cleanup',
    );

    const testDataRecord = this.testDataRegistry.get(collectionName);

    if (!testDataRecord) {
      this.logger.warn(
        `⚠️ No test data registered for collection: ${collectionName}`,
      );
      return {
        deletedCount: 0,
        message: 'No test data registered for cleanup',
      };
    }

    const safeFilter = this.createSafeTestDataFilter(collectionName);

    try {
      const result = await model.deleteMany(safeFilter).exec();

      this.logger.log(
        `🧹 Safe cleanup completed for ${collectionName}` +
          `\n   Deleted: ${result.deletedCount} test records` +
          `\n   Filter: ${JSON.stringify(safeFilter)}`,
      );

      // Remove from registry after successful cleanup
      this.testDataRegistry.delete(collectionName);

      return result;
    } catch (error) {
      this.logger.error(
        `❌ Error during safe cleanup of ${collectionName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 🛡️ SAFE: Gets count of test data in a collection
   * @param collectionName - Name of the collection
   * @param model - Mongoose model for the collection
   * @returns Count of test data records
   */
  async getTestDataCount<T>(
    collectionName: string,
    model: Model<T>,
  ): Promise<number> {
    const safeFilter = this.createSafeTestDataFilter(collectionName);

    try {
      const count = await model.countDocuments(safeFilter).exec();

      this.logger.debug(
        `📊 Test data count for ${collectionName}: ${count} records`,
      );

      return count;
    } catch (error) {
      this.logger.error(
        `❌ Error counting test data in ${collectionName}: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * 🛡️ SAFE: Lists all registered test data
   * @returns Map of registered test data
   */
  getTestDataRegistry(): Map<string, TestDataRecord> {
    return new Map(this.testDataRegistry);
  }

  /**
   * 🛡️ SAFE: Clears the test data registry
   */
  clearTestDataRegistry(): void {
    this.testDataRegistry.clear();
    this.logger.log('🗑️ Test data registry cleared');
  }

  /**
   * 🛡️ SAFE: Validates that data is safe to delete
   * @param collectionName - Name of the collection
   * @param filter - Filter to be applied
   * @returns True if the operation is safe
   */
  validateSafeOperation(collectionName: string, filter: any): boolean {
    const testDataRecord = this.testDataRegistry.get(collectionName);

    if (!testDataRecord) {
      this.logger.warn(
        `⚠️ No test data registered for collection: ${collectionName}`,
      );
      return false;
    }

    // Check if filter would affect non-test data
    const hasTestDataFilter =
      filter &&
      (filter.isTestData === true ||
        filter.testPrefix ||
        filter.testId ||
        filter._id?.$in ||
        filter.title?.$regex ||
        filter.description?.$regex);

    if (!hasTestDataFilter) {
      this.logger.error(
        `🚨 UNSAFE OPERATION: Filter for ${collectionName} does not target test data only`,
      );
      return false;
    }

    return true;
  }
}
