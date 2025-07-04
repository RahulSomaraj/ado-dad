# ADO-DAD API Test Suite

This directory contains comprehensive end-to-end (E2E) tests for the ADO-DAD API, covering all major functionality from authentication to vehicle inventory management and advertisement creation.

## 📋 Test Coverage

### 🔐 Authentication Tests (`auth.e2e-spec.ts`)

- **User Registration**: Validates user creation with proper validation
- **User Login**: Tests authentication flow and token generation
- **Token Refresh**: Verifies JWT refresh token functionality
- **User Logout**: Tests session termination
- **Profile Management**: Tests user profile retrieval and updates

**Test Scenarios:**

- ✅ Successful registration with valid data
- ❌ Registration with invalid phone numbers
- ❌ Registration with weak passwords
- ❌ Duplicate phone number registration
- ✅ Successful login with valid credentials
- ❌ Login with invalid credentials
- ✅ Token refresh functionality
- ✅ Profile retrieval and updates

### 👥 User Management Tests (`users.e2e-spec.ts`)

- **User CRUD Operations**: Complete user lifecycle management
- **Profile Management**: User profile updates and retrieval
- **User Search & Filtering**: Advanced user querying capabilities

**Test Scenarios:**

- ✅ Get all users with pagination
- ✅ Filter users by user type
- ✅ Search users by name
- ✅ Get user by ID
- ✅ Update user information
- ✅ Delete user accounts
- ✅ Get current user profile
- ✅ Update current user profile

### 🚗 Vehicle Inventory Tests (`vehicle-inventory.e2e-spec.ts`)

- **Manufacturer Management**: Complete manufacturer CRUD operations
- **Vehicle Models**: Model creation, retrieval, and filtering
- **Vehicle Variants**: Variant management with detailed specifications

**Test Scenarios:**

- ✅ Create manufacturers with full details
- ✅ Get manufacturers with filtering and search
- ✅ Update manufacturer information
- ✅ Delete manufacturers
- ✅ Create vehicle models with specifications
- ✅ Filter models by manufacturer, type, segment
- ✅ Create vehicle variants with features
- ✅ Filter variants by model, fuel type, price range

### 📢 Advertisement Tests (`ads.e2e-spec.ts`)

- **Vehicle Ads**: Complete vehicle advertisement lifecycle
- **Property Ads**: Property listing creation and management
- **Commercial Vehicle Ads**: Commercial vehicle advertisement handling
- **General Ad Operations**: Cross-category ad management

**Test Scenarios:**

- ✅ Create vehicle ads with full specifications
- ✅ Filter vehicle ads by price, location, type
- ✅ Update vehicle ad information
- ✅ Delete vehicle advertisements
- ✅ Create property ads with detailed information
- ✅ Filter property ads by type, bedrooms, price
- ✅ Create commercial vehicle ads
- ✅ Filter commercial ads by vehicle type, body type
- ✅ General ad search and filtering
- ✅ User-specific ad management

## 🚀 Running Tests

### Prerequisites

1. Ensure MongoDB is running
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)

### Test Commands

#### Run All Tests

```bash
npm run test:all
```

This runs the comprehensive test suite with detailed reporting.

#### Run Specific Test Suites

```bash
# Authentication tests only
npm run test:auth

# User management tests only
npm run test:users

# Vehicle inventory tests only
npm run test:vehicle-inventory

# Advertisement tests only
npm run test:ads
```

#### Run Individual Test Files

```bash
# Run all E2E tests
npm run test:e2e

# Run unit tests
npm run test

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch
```

#### Generate Test Reports

```bash
npm run test:report
```

This runs all tests and opens the detailed report.

## 📊 Test Reports

### Coverage Reports

- **Unit Tests**: `coverage/lcov-report/index.html`
- **E2E Tests**: `coverage/e2e-test-report.json`
- **Combined Report**: `coverage/test-execution-report.json`

### Report Structure

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "summary": {
    "totalDuration": 15000,
    "totalTests": 150,
    "totalPassed": 145,
    "totalFailed": 5,
    "successRate": 96.67
  },
  "details": {
    "unit": {
      "passed": 80,
      "failed": 2,
      "total": 82,
      "duration": 8000
    },
    "e2e": {
      "passed": 65,
      "failed": 3,
      "total": 68,
      "duration": 7000
    }
  }
}
```

## 🧪 Test Data Management

### Database Cleanup

Each test suite automatically:

- Clears relevant collections before each test
- Creates necessary test data
- Cleans up after test completion

### Test Data Isolation

- Tests use isolated test data
- No interference between test suites
- Automatic cleanup prevents data pollution

## 🔧 Test Configuration

### Jest E2E Configuration (`test/jest-e2e.json`)

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

### Test Environment Setup

- **Database**: Uses test MongoDB instance
- **Authentication**: JWT-based token management
- **HTTP Client**: Supertest for API testing
- **Validation**: Comprehensive request/response validation

## 📝 Test Writing Guidelines

### Test Structure

```typescript
describe('Feature Name', () => {
  beforeEach(async () => {
    // Setup test data
  });

  it('should perform expected action', () => {
    // Test implementation
  });

  it('should handle error cases', () => {
    // Error scenario testing
  });
});
```

### Best Practices

1. **Descriptive Test Names**: Use clear, descriptive test names
2. **Setup/Teardown**: Always clean up test data
3. **Validation**: Test both success and failure scenarios
4. **Isolation**: Ensure tests don't depend on each other
5. **Coverage**: Aim for comprehensive API coverage

### Test Data Patterns

```typescript
// Valid test data
const validData = {
  // Complete, valid data structure
};

// Invalid test data
const invalidData = {
  // Missing required fields or invalid values
};

// Edge cases
const edgeCaseData = {
  // Boundary conditions and edge cases
};
```

## 🐛 Troubleshooting

### Common Issues

#### MongoDB Connection Issues

```bash
# Ensure MongoDB is running
mongod --dbpath /path/to/data/db

# Check connection string in environment
echo $MONGODB_URI
```

#### Test Timeout Issues

```bash
# Increase Jest timeout
jest --testTimeout=30000

# Or in test file
jest.setTimeout(30000);
```

#### Authentication Issues

- Verify JWT secret is set in environment
- Check token expiration settings
- Ensure auth guards are properly configured

### Debug Mode

```bash
# Run tests in debug mode
npm run test:debug

# Run specific test with debugging
node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand --testNamePattern="should create user"
```

## 📈 Performance Metrics

### Test Execution Times

- **Unit Tests**: ~5-10 seconds
- **E2E Tests**: ~30-60 seconds
- **Full Suite**: ~1-2 minutes

### Coverage Targets

- **Line Coverage**: >90%
- **Branch Coverage**: >85%
- **Function Coverage**: >95%

## 🔄 Continuous Integration

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    npm install
    npm run test:all
    npm run test:cov
```

### Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:all"
    }
  }
}
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)
- [MongoDB Testing Best Practices](https://docs.mongodb.com/manual/core/testing/)

## 🤝 Contributing

When adding new tests:

1. Follow the existing test structure
2. Add comprehensive test cases
3. Update this README with new test coverage
4. Ensure all tests pass before submitting

## 📞 Support

For test-related issues:

1. Check the troubleshooting section
2. Review test logs and error messages
3. Verify environment configuration
4. Contact the development team
