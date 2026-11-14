import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TestDataSafetyService } from '../services/test-data-safety.service';
import { SafeTestDataManagerService } from '../services/safe-test-data-manager.service';
import {
  TEST_DATA_SAFETY_KEY,
  TEST_DATA_COLLECTION_KEY,
  TEST_DATA_PREFIX_KEY,
  TestDataSafetyMetadata,
} from '../decorators/test-data-safety.decorators';

@Injectable()
export class TestDataSafetyGuard implements CanActivate {
  private readonly logger = new Logger(TestDataSafetyGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly testDataSafetyService: TestDataSafetyService,
    private readonly safeTestDataManager: SafeTestDataManagerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    // Get metadata from decorators
    const testDataSafety = this.reflector.get<TestDataSafetyMetadata>(
      TEST_DATA_SAFETY_KEY,
      handler,
    );
    const collection = this.reflector.get<string>(
      TEST_DATA_COLLECTION_KEY,
      handler,
    );
    const prefix = this.reflector.get<string>(TEST_DATA_PREFIX_KEY, handler);
    const noHardDelete = this.reflector.get<boolean>('noHardDelete', handler);
    const requireTestDataMarkers = this.reflector.get<boolean>(
      'requireTestDataMarkers',
      handler,
    );
    const auditOperations = this.reflector.get<boolean>(
      'auditDatabaseOperations',
      handler,
    );
    const validateEnvironment = this.reflector.get<boolean>(
      'validateEnvironment',
      handler,
    );

    // If no safety metadata, allow execution but log warning
    if (!testDataSafety && !noHardDelete && !requireTestDataMarkers) {
      this.logger.warn(
        `⚠️ Method ${handler.name} has no test data safety decorators. ` +
          `Consider adding @TestDataSafe() or @NoHardDelete() decorator.`,
      );
      return true;
    }

    // Validate environment if required
    if (validateEnvironment) {
      try {
        this.testDataSafetyService.validateEnvironmentForDestructiveOperation(
          handler.name,
        );
      } catch (error) {
        this.logger.error(`🚨 Environment validation failed: ${error.message}`);
        throw new ForbiddenException(
          `Environment validation failed: ${error.message}`,
        );
      }
    }

    // Check for hard delete operations
    if (noHardDelete || (testDataSafety && !testDataSafety.allowHardDelete)) {
      const method = request.method;
      const url = request.url;

      if (
        method === 'DELETE' ||
        url.includes('delete') ||
        url.includes('remove')
      ) {
        this.logger.error(
          `🚨 HARD DELETE BLOCKED: Method ${handler.name} attempted to delete data. ` +
            `Use @TestDataCleanup() decorator for safe test data cleanup.`,
        );
        throw new ForbiddenException(
          'Hard delete operations are blocked. Use safe test data cleanup methods.',
        );
      }
    }

    // Validate test data markers if required
    if (
      requireTestDataMarkers ||
      (testDataSafety && testDataSafety.requireTestDataMarkers)
    ) {
      const body = request.body;
      const query = request.query;

      if (!this.hasTestDataMarkers(body) && !this.hasTestDataMarkers(query)) {
        this.logger.error(
          `🚨 TEST DATA MARKERS REQUIRED: Method ${handler.name} requires test data markers. ` +
            `Use SafeTestDataManager.createTestDataWithMarkers() to create safe test data.`,
        );
        throw new ForbiddenException(
          'Test data markers are required. Use safe test data creation methods.',
        );
      }
    }

    // Audit database operations if required
    if (auditOperations) {
      this.logger.log(
        `📊 Database operation audited: ${handler.name}` +
          `\n   Method: ${request.method}` +
          `\n   URL: ${request.url}` +
          `\n   Body: ${JSON.stringify(request.body)}` +
          `\n   Query: ${JSON.stringify(request.query)}` +
          `\n   Timestamp: ${new Date().toISOString()}`,
      );
    }

    // Validate collection-specific safety if metadata exists
    if (testDataSafety && collection) {
      const isSafe = this.safeTestDataManager.validateSafeOperation(
        collection,
        request.body,
      );

      if (!isSafe) {
        this.logger.error(
          `🚨 UNSAFE OPERATION: Method ${handler.name} on collection ${collection} ` +
            `does not meet safety requirements.`,
        );
        throw new ForbiddenException(
          `Operation on collection ${collection} does not meet safety requirements.`,
        );
      }
    }

    this.logger.debug(
      `✅ Test data safety validation passed for ${handler.name}`,
    );
    return true;
  }

  /**
   * Check if data has test data markers
   */
  private hasTestDataMarkers(data: any): boolean {
    if (!data) return false;

    return (
      data.isTestData === true ||
      data.testPrefix ||
      data.testId ||
      data.testCreatedAt ||
      data.testEnvironment
    );
  }
}
