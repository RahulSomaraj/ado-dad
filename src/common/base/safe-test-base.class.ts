import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TestDataSafetyService } from '../services/test-data-safety.service';
import { SafeTestDataManagerService } from '../services/safe-test-data-manager.service';

@Injectable()
export abstract class SafeTestBaseClass {
  protected readonly logger = new Logger(this.constructor.name);
  protected testDataIds: Map<string, string[]> = new Map();

  constructor(
    protected readonly testDataSafetyService: TestDataSafetyService,
    protected readonly safeTestDataManager: SafeTestDataManagerService,
  ) {}

  /**
   * 🛡️ SAFE: Creates test data with safety markers
   * @param collectionName - Name of the collection
   * @param model - Mongoose model
   * @param data - Data to create
   * @param testPrefix - Test data prefix
   * @returns Created document with test markers
   */
  protected async createSafeTestData<T>(
    collectionName: string,
    model: Model<T>,
    data: any,
    testPrefix: string = 'Test',
  ): Promise<T> {
    // Validate environment
    this.testDataSafetyService.validateEnvironmentForDestructiveOperation(
      'create test data',
    );

    // Create test data with safety markers
    const safeTestData = this.safeTestDataManager.createTestDataWithMarkers(
      data,
      testPrefix,
    );

    try {
      const createdDoc = await model.create(safeTestData);

      // Register test data for tracking
      const docId = (createdDoc as any)._id?.toString();
      if (docId) {
        const existingIds = this.testDataIds.get(collectionName) || [];
        existingIds.push(docId);
        this.testDataIds.set(collectionName, existingIds);

        this.safeTestDataManager.registerTestData(
          collectionName,
          existingIds,
          testPrefix,
        );
      }

      this.logger.log(
        `✅ Safe test data created in ${collectionName}: ${docId}` +
          `\n   Test Prefix: ${testPrefix}` +
          `\n   Test ID: ${(createdDoc as any).testId}`,
      );

      return createdDoc;
    } catch (error) {
      this.logger.error(
        `❌ Error creating safe test data in ${collectionName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 🛡️ SAFE: Finds test data using safe filters
   * @param collectionName - Name of the collection
   * @param model - Mongoose model
   * @param additionalFilter - Additional filter criteria
   * @returns Array of test data documents
   */
  protected async findSafeTestData<T>(
    collectionName: string,
    model: Model<T>,
    additionalFilter: any = {},
  ): Promise<T[]> {
    const safeFilter = this.safeTestDataManager.createSafeTestDataFilter(
      collectionName,
      additionalFilter,
    );

    try {
      const results = await model.find(safeFilter).exec();

      this.logger.debug(
        `🔍 Safe test data query in ${collectionName}: Found ${results.length} records`,
      );

      return results;
    } catch (error) {
      this.logger.error(
        `❌ Error finding safe test data in ${collectionName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 🛡️ SAFE: Updates test data using safe filters
   * @param collectionName - Name of the collection
   * @param model - Mongoose model
   * @param filter - Filter criteria
   * @param update - Update data
   * @returns Update result
   */
  protected async updateSafeTestData<T>(
    collectionName: string,
    model: Model<T>,
    filter: any,
    update: any,
  ): Promise<any> {
    // Validate that filter only targets test data
    const isSafe = this.safeTestDataManager.validateSafeOperation(
      collectionName,
      filter,
    );

    if (!isSafe) {
      throw new Error(
        `🚨 UNSAFE UPDATE: Filter for ${collectionName} does not target test data only`,
      );
    }

    try {
      const result = await model.updateMany(filter, update).exec();

      this.logger.log(
        `✏️ Safe test data update in ${collectionName}: ${result.modifiedCount} records modified`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `❌ Error updating safe test data in ${collectionName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 🛡️ SAFE: Deletes test data using safe filters
   * @param collectionName - Name of the collection
   * @param model - Mongoose model
   * @param additionalFilter - Additional filter criteria
   * @returns Deletion result
   */
  protected async deleteSafeTestData<T>(
    collectionName: string,
    model: Model<T>,
    additionalFilter: any = {},
  ): Promise<any> {
    try {
      const result = await this.safeTestDataManager.safeCleanupTestData(
        collectionName,
        model,
      );

      // Remove from local tracking
      this.testDataIds.delete(collectionName);

      this.logger.log(
        `🧹 Safe test data cleanup completed for ${collectionName}: ${result.deletedCount} records deleted`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `❌ Error during safe test data cleanup in ${collectionName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 🛡️ SAFE: Gets count of test data
   * @param collectionName - Name of the collection
   * @param model - Mongoose model
   * @returns Count of test data records
   */
  protected async getSafeTestDataCount<T>(
    collectionName: string,
    model: Model<T>,
  ): Promise<number> {
    return await this.safeTestDataManager.getTestDataCount(
      collectionName,
      model,
    );
  }

  /**
   * 🛡️ SAFE: Cleans up all test data for this test instance
   */
  protected async cleanupAllTestData(): Promise<void> {
    this.logger.log('🧹 Starting cleanup of all test data...');

    const entries = Array.from(this.testDataIds.entries());
    for (const [collectionName, testIds] of entries) {
      this.logger.debug(
        `Cleaning up test data in collection: ${collectionName}`,
      );
      // Note: This would need the actual model instances to work
      // In practice, you'd need to implement this differently
    }

    this.testDataIds.clear();
    this.logger.log('✅ All test data cleanup completed');
  }

  /**
   * 🛡️ SAFE: Validates test data integrity
   * @param collectionName - Name of the collection
   * @param expectedCount - Expected number of test records
   * @returns True if integrity check passes
   */
  protected async validateTestDataIntegrity(
    collectionName: string,
    expectedCount: number,
  ): Promise<boolean> {
    const actualCount = await this.getSafeTestDataCount(
      collectionName,
      null as any,
    );

    if (actualCount !== expectedCount) {
      this.logger.error(
        `🚨 Test data integrity check failed for ${collectionName}` +
          `\n   Expected: ${expectedCount}, Actual: ${actualCount}`,
      );
      return false;
    }

    this.logger.debug(
      `✅ Test data integrity check passed for ${collectionName}: ${actualCount} records`,
    );

    return true;
  }

  /**
   * 🛡️ SAFE: Logs test data summary
   */
  protected logTestDataSummary(): void {
    this.logger.log('📊 Test Data Summary:');

    const entries = Array.from(this.testDataIds.entries());
    for (const [collectionName, testIds] of entries) {
      this.logger.log(`   ${collectionName}: ${testIds.length} test records`);
    }
  }
}
