module.exports = {
  // 🛡️ ESLint Rules for Test Data Safety
  // This configuration prevents hard database deletions and enforces test safety

  rules: {
    // 🚨 BLOCK HARD DATABASE DELETIONS

    // Block deleteMany() without safety decorators
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.property.name="deleteMany"]',
        message:
          '🚨 HARD DELETE BLOCKED: Use @TestDataSafe() decorator and SafeTestBaseClass.deleteSafeTestData() instead of deleteMany(). This prevents accidental data loss.',
      },
    ],

    // Block remove() without safety decorators
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.property.name="remove"]',
        message:
          '🚨 HARD DELETE BLOCKED: Use @TestDataSafe() decorator and SafeTestBaseClass.deleteSafeTestData() instead of remove(). This prevents accidental data loss.',
      },
    ],

    // Block drop() operations
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.property.name="drop"]',
        message:
          '🚨 DROP OPERATION BLOCKED: drop() operations are never allowed. Use safe test data cleanup methods instead.',
      },
    ],

    // Block dropDatabase() operations
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.property.name="dropDatabase"]',
        message:
          '🚨 DROP DATABASE BLOCKED: dropDatabase() operations are never allowed. This is a destructive operation that can cause data loss.',
      },
    ],

    // Block dropCollection() operations
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.property.name="dropCollection"]',
        message:
          '🚨 DROP COLLECTION BLOCKED: dropCollection() operations are never allowed. Use safe test data cleanup methods instead.',
      },
    ],

    // 🛡️ ENFORCE TEST SAFETY DECORATORS

    // Require @TestDataSafe() for methods that modify data
    'custom-rule/require-test-data-safety': [
      'error',
      {
        message:
          '🛡️ TEST SAFETY REQUIRED: Methods that modify data must use @TestDataSafe() decorator. This ensures data safety and prevents accidental loss.',
      },
    ],

    // Require @NoHardDelete() for methods that could delete data
    'custom-rule/require-no-hard-delete': [
      'error',
      {
        message:
          '🛡️ NO HARD DELETE REQUIRED: Methods that could delete data must use @NoHardDelete() decorator. This prevents accidental data deletion.',
      },
    ],

    // 🧪 ENFORCE TEST DATA MARKERS

    // Require test data markers for test data creation
    'custom-rule/require-test-data-markers': [
      'error',
      {
        message:
          '🧪 TEST DATA MARKERS REQUIRED: Test data must include safety markers. Use SafeTestDataManager.createTestDataWithMarkers() to create safe test data.',
      },
    ],

    // 🚫 BLOCK UNSAFE PATTERNS

    // Block empty deleteMany() calls
    'no-restricted-syntax': [
      'error',
      {
        selector:
          'CallExpression[callee.property.name="deleteMany"] > Literal[value="{}"]',
        message:
          '🚨 EMPTY DELETE BLOCKED: deleteMany({}) will delete ALL data! Use SafeTestBaseClass.deleteSafeTestData() with proper filters instead.',
      },
    ],

    // Block deleteMany() with only regex filters
    'no-restricted-syntax': [
      'error',
      {
        selector:
          'CallExpression[callee.property.name="deleteMany"] > ObjectExpression > Property[key.name="title"] > Literal[regex=/^Test/]',
        message:
          '🚨 UNSAFE REGEX DELETE BLOCKED: Regex-only filters can be dangerous. Use SafeTestBaseClass.deleteSafeTestData() with proper test data tracking instead.',
      },
    ],

    // Block beforeEach/afterEach with hard deletions
    'no-restricted-syntax': [
      'error',
      {
        selector:
          'CallExpression[callee.name="beforeEach"] > FunctionExpression > BlockStatement > ExpressionStatement > CallExpression[callee.property.name="deleteMany"]',
        message:
          '🚨 BEFORE EACH HARD DELETE BLOCKED: beforeEach() with deleteMany() will delete data before every test! Use SafeTestBaseClass.deleteSafeTestData() instead.',
      },
    ],

    'no-restricted-syntax': [
      'error',
      {
        selector:
          'CallExpression[callee.name="afterEach"] > FunctionExpression > BlockStatement > ExpressionStatement > CallExpression[callee.property.name="deleteMany"]',
        message:
          '🚨 AFTER EACH HARD DELETE BLOCKED: afterEach() with deleteMany() will delete data after every test! Use SafeTestBaseClass.deleteSafeTestData() instead.',
      },
    ],

    // 🎯 ENFORCE SAFE TESTING PATTERNS

    // Require SafeTestBaseClass inheritance for test services
    'custom-rule/require-safe-test-base': [
      'error',
      {
        message:
          '🛡️ SAFE TEST BASE REQUIRED: Test services should extend SafeTestBaseClass to inherit safety features and prevent accidental data loss.',
      },
    ],

    // Require test data registration
    'custom-rule/require-test-data-registration': [
      'error',
      {
        message:
          '📝 TEST DATA REGISTRATION REQUIRED: Test data must be registered for tracking and safe cleanup. Use SafeTestDataManager.registerTestData() or SafeTestBaseClass.createSafeTestData().',
      },
    ],

    // 🔍 ENFORCE AUDIT AND LOGGING

    // Require audit decorators for destructive operations
    'custom-rule/require-audit-decorators': [
      'error',
      {
        message:
          '📊 AUDIT REQUIRED: Destructive operations must use @AuditDatabaseOperations() decorator for compliance and tracking.',
      },
    ],

    // Require environment validation
    'custom-rule/require-environment-validation': [
      'error',
      {
        message:
          '🌍 ENVIRONMENT VALIDATION REQUIRED: Operations that could affect data must use @ValidateEnvironment() decorator to ensure they run in safe environments.',
      },
    ],

    // 📚 DOCUMENTATION AND COMMENTS

    // Require JSDoc for test methods
    'jsdoc/require-jsdoc': [
      'error',
      {
        publicOnly: false,
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
        },
        context: [
          'FunctionDeclaration',
          'MethodDefinition',
          'ClassDeclaration',
        ],
      },
    ],

    // Require safety comments for complex operations
    'custom-rule/require-safety-comments': [
      'error',
      {
        message:
          '🛡️ SAFETY COMMENT REQUIRED: Complex database operations must include safety comments explaining how data is protected.',
      },
    ],
  },

  // 📁 File-specific rules
  overrides: [
    {
      // Test files have stricter rules
      files: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts'],
      rules: {
        // All safety rules are enforced in test files
        'no-restricted-syntax': 'error',
        'custom-rule/require-test-data-safety': 'error',
        'custom-rule/require-no-hard-delete': 'error',
        'custom-rule/require-test-data-markers': 'error',
        'custom-rule/require-safe-test-base': 'error',
        'custom-rule/require-test-data-registration': 'error',
        'custom-rule/require-audit-decorators': 'error',
        'custom-rule/require-environment-validation': 'error',
        'custom-rule/require-safety-comments': 'error',
      },
    },
    {
      // Seed files have specific rules
      files: ['**/seed/**/*.ts', '**/*seed*.ts'],
      rules: {
        // Seed files must use safety services
        'custom-rule/require-safe-seed-methods': [
          'error',
          {
            message:
              '🌱 SAFE SEED METHODS REQUIRED: Seed files must use SafeTestDataManager or TestDataSafetyService to prevent accidental data loss.',
          },
        ],
      },
    },
    {
      // Service files have specific rules
      files: ['**/services/**/*.ts'],
      rules: {
        // Service methods that modify data must be protected
        'custom-rule/require-service-safety': [
          'error',
          {
            message:
              '🛡️ SERVICE SAFETY REQUIRED: Service methods that modify data must use appropriate safety decorators to prevent accidental data loss.',
          },
        ],
      },
    },
  ],

  // 🔧 Custom rule definitions
  plugins: ['custom-rule'],

  // 📋 Rule documentation
  settings: {
    'custom-rule': {
      // Documentation for custom rules
      'require-test-data-safety':
        'Ensures methods that modify data use @TestDataSafe() decorator',
      'require-no-hard-delete':
        'Ensures methods that could delete data use @NoHardDelete() decorator',
      'require-test-data-markers': 'Ensures test data includes safety markers',
      'require-safe-test-base':
        'Ensures test services extend SafeTestBaseClass',
      'require-test-data-registration':
        'Ensures test data is registered for tracking',
      'require-audit-decorators': 'Ensures destructive operations are audited',
      'require-environment-validation':
        'Ensures environment is validated before operations',
      'require-safety-comments':
        'Ensures complex operations include safety comments',
      'require-safe-seed-methods': 'Ensures seed files use safe methods',
      'require-service-safety': 'Ensures service methods are protected',
    },
  },
};
