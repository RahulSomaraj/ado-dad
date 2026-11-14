import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { TestDataSafetyGuard } from '../guards/test-data-safety.guard';

// Metadata keys for test data safety
export const TEST_DATA_SAFETY_KEY = 'testDataSafety';
export const TEST_DATA_COLLECTION_KEY = 'testDataCollection';
export const TEST_DATA_PREFIX_KEY = 'testDataPrefix';

// Interface for test data safety metadata
export interface TestDataSafetyMetadata {
  collection: string;
  prefix: string;
  requireTestDataMarkers: boolean;
  allowHardDelete: boolean;
}

/**
 * 🛡️ DECORATOR: Ensures test data safety for database operations
 * @param metadata - Test data safety configuration
 */
export function TestDataSafe(metadata: TestDataSafetyMetadata) {
  return applyDecorators(
    SetMetadata(TEST_DATA_SAFETY_KEY, metadata),
    SetMetadata(TEST_DATA_COLLECTION_KEY, metadata.collection),
    SetMetadata(TEST_DATA_PREFIX_KEY, metadata.prefix),
    UseGuards(TestDataSafetyGuard),
  );
}

/**
 * 🛡️ DECORATOR: Marks method as safe for test data only
 * @param collection - Collection name
 * @param prefix - Test data prefix
 */
export function TestDataOnly(collection: string, prefix: string = 'Test') {
  return TestDataSafe({
    collection,
    prefix,
    requireTestDataMarkers: true,
    allowHardDelete: false,
  });
}

/**
 * 🛡️ DECORATOR: Marks method as safe for test data cleanup
 * @param collection - Collection name
 * @param prefix - Test data prefix
 */
export function TestDataCleanup(collection: string, prefix: string = 'Test') {
  return TestDataSafe({
    collection,
    prefix,
    requireTestDataMarkers: true,
    allowHardDelete: true,
  });
}

/**
 * 🛡️ DECORATOR: Prevents any database deletion operations
 */
export function NoHardDelete() {
  return SetMetadata('noHardDelete', true);
}

/**
 * 🛡️ DECORATOR: Requires test data markers for all operations
 */
export function RequireTestDataMarkers() {
  return SetMetadata('requireTestDataMarkers', true);
}

/**
 * 🛡️ DECORATOR: Logs all database operations for audit
 */
export function AuditDatabaseOperations() {
  return SetMetadata('auditDatabaseOperations', true);
}

/**
 * 🛡️ DECORATOR: Validates environment before execution
 */
export function ValidateEnvironment() {
  return SetMetadata('validateEnvironment', true);
}
