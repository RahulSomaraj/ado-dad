import { registerAs } from '@nestjs/config';

export default registerAs('testSafety', () => ({
  // 🛡️ ENVIRONMENT SAFETY RULES
  environment: {
    // Block destructive operations in these environments
    blockedEnvironments: ['production', 'staging'],

    // Allow destructive operations only in these environments
    allowedEnvironments: ['test', 'development'],

    // Default environment for safety checks
    defaultEnvironment: process.env.NODE_ENV || 'development',
  },

  // 🛡️ DATABASE SAFETY RULES
  database: {
    // Collections that are NEVER allowed to be deleted
    protectedCollections: [
      'users',
      'roles',
      'permissions',
      'system_config',
      'audit_logs',
      'backup_data',
    ],

    // Collections that require special permission for deletion
    restrictedCollections: [
      'ads',
      'properties',
      'vehicles',
      'transactions',
      'payments',
    ],

    // Maximum number of records that can be deleted in a single operation
    maxDeleteLimit: 1000,

    // Require confirmation for deletions above this threshold
    confirmationThreshold: 100,
  },

  // 🛡️ TEST DATA SAFETY RULES
  testData: {
    // Required prefixes for test data
    requiredPrefixes: ['Test', 'test-', 'TEST_'],

    // Required markers for test data
    requiredMarkers: [
      'isTestData',
      'testPrefix',
      'testId',
      'testCreatedAt',
      'testEnvironment',
    ],

    // Maximum age of test data (in hours) before auto-cleanup
    maxAge: 24,

    // Auto-cleanup enabled
    autoCleanup: true,

    // Backup test data before deletion
    backupBeforeDeletion: true,
  },

  // 🛡️ OPERATION SAFETY RULES
  operations: {
    // Operations that are always blocked
    blockedOperations: [
      'dropDatabase',
      'dropCollection',
      'removeAll',
      'deleteAll',
      'truncate',
    ],

    // Operations that require special permission
    restrictedOperations: [
      'deleteMany',
      'removeMany',
      'bulkDelete',
      'massDelete',
    ],

    // Operations that are always safe
    safeOperations: ['find', 'findOne', 'count', 'aggregate', 'distinct'],
  },

  // 🛡️ AUDIT AND LOGGING
  audit: {
    // Log all database operations
    logAllOperations: true,

    // Log destructive operations with extra detail
    logDestructiveOperations: true,

    // Log test data operations
    logTestDataOperations: true,

    // Log environment validation
    logEnvironmentValidation: true,

    // Log safety rule violations
    logSafetyViolations: true,
  },

  // 🛡️ NOTIFICATION RULES
  notifications: {
    // Notify on safety rule violations
    notifyOnViolations: true,

    // Notify on large deletions
    notifyOnLargeDeletions: true,

    // Notify on environment changes
    notifyOnEnvironmentChanges: true,

    // Notification channels
    channels: ['log', 'console', 'email'],
  },

  // 🛡️ OVERRIDE RULES (for emergency situations)
  overrides: {
    // Allow emergency overrides
    allowEmergencyOverrides: false,

    // Emergency override token (should be secure)
    emergencyToken: process.env.EMERGENCY_OVERRIDE_TOKEN || null,

    // Emergency override time limit (in minutes)
    emergencyTimeLimit: 15,

    // Emergency override logging
    logEmergencyOverrides: true,
  },
}));
