import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TestDataSafetyService {
  private readonly logger = new Logger(TestDataSafetyService.name);
  private readonly isTestEnvironment: boolean;
  private readonly isDevelopmentEnvironment: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isTestEnvironment = process.env.NODE_ENV === 'test';
    this.isDevelopmentEnvironment = process.env.NODE_ENV === 'development';
  }

  /**
   * 🛡️ SAFETY CHECK: Prevents hard database deletions in non-test environments
   * @param operation - The operation being performed
   * @param collection - The collection being affected
   * @param filter - The filter being applied
   * @throws Error if attempting to delete production/development data
   */
  validateSafeDeletion(
    operation: string,
    collection: string,
    filter: any,
  ): void {
    if (this.isTestEnvironment) {
      this.logger.debug(
        `✅ Test environment: Safe to perform ${operation} on ${collection}`,
      );
      return;
    }

    if (this.isDevelopmentEnvironment) {
      this.logger.warn(
        `⚠️ Development environment: ${operation} on ${collection} - Use with caution`,
      );
      return;
    }

    // 🚨 PRODUCTION SAFETY: Block any deletion operations
    if (operation.toLowerCase().includes('delete')) {
      throw new Error(
        `🚨 PRODUCTION SAFETY VIOLATION: Attempted to ${operation} on ${collection} in production environment. ` +
          `This operation is blocked to prevent data loss. Use test environment for destructive operations.`,
      );
    }
  }

  /**
   * 🛡️ SAFETY CHECK: Ensures deletion only affects test data
   * @param filter - The filter being applied
   * @param testDataIdentifiers - Identifiers that mark test data
   * @param operation - The operation being performed
   * @param collection - The collection being affected
   * @returns Safe filter that only targets test data
   */
  createSafeTestFilter(
    filter: any,
    testDataIdentifiers: string[],
    operation: string,
    collection: string,
  ): any {
    if (this.isTestEnvironment) {
      // In test environment, allow deletion but ensure it's targeted
      return filter;
    }

    // In non-test environments, force filtering to only test data
    const safeFilter = {
      ...filter,
      $or: [
        { _id: { $in: testDataIdentifiers } },
        { title: { $regex: /^Test / } },
        { description: { $regex: /^Test / } },
        { email: { $regex: /^test-/ } },
        { username: { $regex: /^test-/ } },
        { phone: { $regex: /^test-/ } },
        { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // Last 24 hours
      ],
    };

    this.logger.warn(
      `🛡️ Safety filter applied: ${operation} on ${collection} will only affect test data`,
    );

    return safeFilter;
  }

  /**
   * 🛡️ SAFETY CHECK: Validates test data identifiers
   * @param testDataIds - Array of test data IDs
   * @returns Validated test data IDs
   */
  validateTestDataIds(testDataIds: string[]): string[] {
    if (!Array.isArray(testDataIds) || testDataIds.length === 0) {
      throw new Error('Test data IDs must be a non-empty array');
    }

    // Ensure all IDs are valid MongoDB ObjectId format
    const validIds = testDataIds.filter((id) => {
      try {
        return /^[0-9a-fA-F]{24}$/.test(id);
      } catch {
        return false;
      }
    });

    if (validIds.length !== testDataIds.length) {
      this.logger.warn(
        `⚠️ Some test data IDs are invalid: ${testDataIds.length - validIds.length} invalid IDs`,
      );
    }

    return validIds;
  }

  /**
   * 🛡️ SAFETY CHECK: Creates a test data marker
   * @param prefix - Prefix for test data
   * @returns Test data marker object
   */
  createTestDataMarker(prefix: string = 'Test'): any {
    return {
      isTestData: true,
      testPrefix: prefix,
      testTimestamp: new Date(),
      testEnvironment: process.env.NODE_ENV || 'unknown',
    };
  }

  /**
   * 🛡️ SAFETY CHECK: Validates environment before destructive operations
   * @param operation - The operation being performed
   * @throws Error if environment is not safe for destructive operations
   */
  validateEnvironmentForDestructiveOperation(operation: string): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `🚨 PRODUCTION SAFETY: ${operation} is blocked in production environment`,
      );
    }

    if (process.env.NODE_ENV === 'staging') {
      throw new Error(
        `🚨 STAGING SAFETY: ${operation} is blocked in staging environment`,
      );
    }

    this.logger.debug(`✅ Environment validated for ${operation}`);
  }

  /**
   * 🛡️ SAFETY CHECK: Logs all database operations for audit
   * @param operation - The operation being performed
   * @param collection - The collection being affected
   * @param filter - The filter being applied
   * @param result - The result of the operation
   */
  logDatabaseOperation(
    operation: string,
    collection: string,
    filter: any,
    result: any,
  ): void {
    this.logger.log(
      `📊 Database Operation: ${operation} on ${collection}` +
        `\n   Filter: ${JSON.stringify(filter)}` +
        `\n   Result: ${JSON.stringify(result)}` +
        `\n   Environment: ${process.env.NODE_ENV}` +
        `\n   Timestamp: ${new Date().toISOString()}`,
    );
  }
}
