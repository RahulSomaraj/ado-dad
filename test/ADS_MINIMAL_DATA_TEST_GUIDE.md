# Ads Minimal Data Tests Guide

This guide provides comprehensive information about testing advertisement creation with minimal data requirements across all supported categories.

## 📋 Overview

The Ads Minimal Data Tests are designed to verify that the advertisement creation API works correctly with the minimum required data for each category, as well as with complete data sets and various edge cases.

## 🎯 Test Categories

### 1. Property Ads

- **Minimal Data**: Basic property information (description, price, location, property type, bedrooms, bathrooms, area)
- **Complete Data**: All optional fields including images, amenities, and additional features
- **Validation**: Required field validation, enum validation, data type validation

### 2. Private Vehicle Ads

- **Minimal Data**: Basic vehicle information with required inventory references
- **Complete Data**: All optional fields including images, features, and documentation status
- **Validation**: ObjectId validation, enum validation, numeric range validation

### 3. Two Wheeler Ads

- **Minimal Data**: Basic two-wheeler information with required inventory references
- **Complete Data**: All optional fields including features and documentation
- **Validation**: Same as private vehicle ads

### 4. Commercial Vehicle Ads

- **Minimal Data**: Basic commercial vehicle information with payload and axle specifications
- **Complete Data**: All optional fields including permits and additional features
- **Validation**: Commercial-specific validation rules

## 🚀 Running the Tests

### Prerequisites

1. **MongoDB**: Ensure MongoDB is running and accessible
2. **Dependencies**: Install all project dependencies
3. **Environment**: Set up proper environment variables
4. **Vehicle Inventory**: Seed vehicle inventory data (for vehicle ads)

### Quick Start

```bash
# Run all minimal data tests
npm run test:ads-minimal

# Run with verbose output
npm run test:ads-minimal -- --verbose

# Run with coverage
npm run test:ads-minimal -- --coverage

# Run in watch mode
npm run test:ads-minimal -- --watch
```

### Manual Execution

```bash
# Run the test runner script directly
node test/run-ads-minimal-tests.js

# Run with specific options
node test/run-ads-minimal-tests.js --verbose --coverage
```

### Using Jest Directly

```bash
# Run the test file directly with Jest
npx jest test/ads-minimal-data.e2e-spec.ts

# Run with specific Jest options
npx jest test/ads-minimal-data.e2e-spec.ts --verbose --testTimeout=30000
```

## 📊 Test Structure

### Test Suites

1. **Property Ads - Minimal Data Tests**

   - Create property ad with minimal required data
   - Create property ad with all optional fields
   - Fail to create property ad with missing required fields
   - Fail to create property ad with invalid property type

2. **Private Vehicle Ads - Minimal Data Tests**

   - Create private vehicle ad with minimal required data
   - Create private vehicle ad with all optional fields
   - Fail to create vehicle ad with missing required fields
   - Fail to create vehicle ad with invalid vehicle type

3. **Two Wheeler Ads - Minimal Data Tests**

   - Create two wheeler ad with minimal required data
   - Create two wheeler ad with all optional fields

4. **Commercial Vehicle Ads - Minimal Data Tests**

   - Create commercial vehicle ad with minimal required data
   - Create commercial vehicle ad with all optional fields
   - Fail to create commercial vehicle ad with missing required fields

5. **Edge Cases and Validation Tests**

   - Fail to create ad without authentication
   - Fail to create ad with invalid category
   - Fail to create ad with negative price
   - Fail to create ad with empty description
   - Fail to create ad with invalid manufacturer ID

6. **GET /ads - Retrieval Tests**
   - Get all ads successfully
   - Filter ads by category
   - Filter ads by price range
   - Search ads by description

## 📝 Sample Data

### Minimal Property Ad

```json
{
  "category": "property",
  "data": {
    "description": "1BHK apartment for sale in prime location",
    "price": 500000,
    "location": "Mumbai, Maharashtra",
    "propertyType": "apartment",
    "bedrooms": 1,
    "bathrooms": 1,
    "areaSqft": 500
  }
}
```

### Minimal Private Vehicle Ad

```json
{
  "category": "private_vehicle",
  "data": {
    "description": "Maruti Swift 2018 for sale in good condition",
    "price": 450000,
    "location": "Gurgaon, Haryana",
    "vehicleType": "four_wheeler",
    "manufacturerId": "507f1f77bcf86cd799439011",
    "modelId": "507f1f77bcf86cd799439012",
    "year": 2018,
    "mileage": 45000,
    "transmissionTypeId": "507f1f77bcf86cd799439014",
    "fuelTypeId": "507f1f77bcf86cd799439015",
    "color": "Silver"
  }
}
```

### Minimal Two Wheeler Ad

```json
{
  "category": "two_wheeler",
  "data": {
    "description": "Honda Activa 6G for sale in excellent condition",
    "price": 65000,
    "location": "Koramangala, Bangalore, Karnataka",
    "vehicleType": "two_wheeler",
    "manufacturerId": "507f1f77bcf86cd799439011",
    "modelId": "507f1f77bcf86cd799439012",
    "year": 2021,
    "mileage": 12000,
    "transmissionTypeId": "507f1f77bcf86cd799439014",
    "fuelTypeId": "507f1f77bcf86cd799439015",
    "color": "Red"
  }
}
```

### Minimal Commercial Vehicle Ad

```json
{
  "category": "commercial_vehicle",
  "data": {
    "description": "Tata 407 truck for sale in good condition",
    "price": 850000,
    "location": "Mumbai, Maharashtra",
    "vehicleType": "four_wheeler",
    "commercialVehicleType": "truck",
    "bodyType": "flatbed",
    "manufacturerId": "507f1f77bcf86cd799439011",
    "modelId": "507f1f77bcf86cd799439012",
    "year": 2018,
    "mileage": 125000,
    "payloadCapacity": 4000,
    "payloadUnit": "kg",
    "axleCount": 2,
    "transmissionTypeId": "507f1f77bcf86cd799439014",
    "fuelTypeId": "507f1f77bcf86cd799439015",
    "color": "White"
  }
}
```

## 🔍 Validation Rules

### Base Fields (All Categories)

- `description`: Required string, cannot be empty
- `price`: Required number, must be >= 0
- `location`: Required string, cannot be empty

### Property-Specific Fields

- `propertyType`: Required enum (apartment, villa, house, plot, commercial)
- `bedrooms`: Required number, must be >= 0
- `bathrooms`: Required number, must be >= 0
- `areaSqft`: Required number, must be > 0

### Vehicle-Specific Fields

- `vehicleType`: Required enum (four_wheeler, two_wheeler)
- `manufacturerId`: Required string, must be valid MongoDB ObjectId
- `modelId`: Required string, must be valid MongoDB ObjectId
- `year`: Required number, must be >= 1900
- `mileage`: Required number, must be >= 0
- `transmissionTypeId`: Required string, must be valid MongoDB ObjectId
- `fuelTypeId`: Required string, must be valid MongoDB ObjectId
- `color`: Required string, cannot be empty

### Commercial Vehicle-Specific Fields

- `commercialVehicleType`: Required enum (truck, bus, van, tractor, trailer, forklift)
- `bodyType`: Required enum (flatbed, container, refrigerated, tanker, dump, pickup, box, passenger)
- `payloadCapacity`: Required number, must be > 0
- `payloadUnit`: Required string (e.g., kg, tons)
- `axleCount`: Required number, must be >= 1 and <= 10

## 📈 Test Results

### Expected Output

When tests run successfully, you should see:

```
🚀 Starting Ads Minimal Data Tests...

============================================================
  ADS MINIMAL DATA TESTS
============================================================

----------------------------------------
  Test Configuration
----------------------------------------
Test File: test/ads-minimal-data.e2e-spec.ts
Output File: test-results/ads-minimal-tests-2024-01-15T10-30-00-000Z.json
HTML Report: test-results/ads-minimal-tests-2024-01-15T10-30-00-000Z.html
Verbose: false
Coverage: false
Watch Mode: false

----------------------------------------
  Running Tests
----------------------------------------
Command: npx jest test/ads-minimal-data.e2e-spec.ts --config test/jest-e2e.json --json --outputFile=test-results/ads-minimal-tests-2024-01-15T10-30-00-000Z.json --testTimeout=30000 --maxWorkers=1

----------------------------------------
  Test Results
----------------------------------------
✅ Tests completed in 15.23s

----------------------------------------
  Generating Report
----------------------------------------
Total Tests: 25
Passed: 25
Failed: 0
Skipped: 0
Duration: 15.23s
Success Rate: 100.00%
📊 HTML Report generated: test-results/ads-minimal-tests-2024-01-15T10-30-00-000Z.html
```

### HTML Report

The test runner generates a comprehensive HTML report with:

- Test summary statistics
- Detailed test results
- Error messages for failed tests
- Test execution times
- Success rate calculation

## 🛠️ Troubleshooting

### Common Issues

1. **MongoDB Connection Error**

   ```
   Error: connect ECONNREFUSED 127.0.0.1:27017
   ```

   **Solution**: Ensure MongoDB is running and accessible

2. **Authentication Error**

   ```
   Error: 401 Unauthorized
   ```

   **Solution**: Check that the test user creation and login is working

3. **ObjectId Validation Error**

   ```
   Error: Invalid ObjectId
   ```

   **Solution**: Ensure vehicle inventory data is properly seeded

4. **Test Timeout**
   ```
   Error: Timeout - Async callback was not invoked within the 30000ms timeout
   ```
   **Solution**: Increase timeout or check for database performance issues

### Debug Mode

Run tests with verbose output to see detailed information:

```bash
npm run test:ads-minimal -- --verbose
```

### Database Setup

Ensure proper database setup:

```bash
# Seed vehicle inventory data first
npm run seed:vehicle-inventory

# Then run ads tests
npm run test:ads-minimal
```

## 📚 Additional Resources

- [Ads API Documentation](../src/ads/README.md)
- [Vehicle Inventory Tests](./VEHICLE_INVENTORY_TEST_GUIDE.md)
- [Sample Data Examples](./ads-minimal-data-examples.json)
- [Test Runner Script](./run-ads-minimal-tests.js)

## 🤝 Contributing

When adding new test cases:

1. Follow the existing test structure
2. Include both minimal and complete data examples
3. Add appropriate validation tests
4. Update this documentation
5. Ensure all tests pass before submitting

## 📞 Support

For issues or questions about the ads minimal data tests:

1. Check the troubleshooting section
2. Review the test logs and HTML reports
3. Verify database setup and data seeding
4. Check the main project documentation
