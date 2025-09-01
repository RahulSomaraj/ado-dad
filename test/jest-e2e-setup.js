// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JEST_WORKER_ID = '1';

// Safety check - prevent running tests against production database
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/adodad';
if (!mongoUri.includes('test') && !mongoUri.includes('localhost')) {
  console.error('⚠️  WARNING: Tests are running against a non-test database!');
  console.error(
    '   This could result in data loss. Please use a test database.',
  );
  console.error(`   Current URI: ${mongoUri}`);
  process.exit(1);
}

// Reduce logging during tests
const originalLog = console.log;
const originalError = console.error;

// Only log errors and warnings during tests
console.log = (...args) => {
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    (args[0].includes('Redis') || args[0].includes('MongoDB'))
  ) {
    return; // Suppress Redis and MongoDB connection logs during tests
  }
  originalLog(...args);
};

console.error = (...args) => {
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    (args[0].includes('Redis') || args[0].includes('MongoDB'))
  ) {
    return; // Suppress Redis and MongoDB error logs during tests
  }
  originalError(...args);
};

// Global test timeout
jest.setTimeout(30000);
