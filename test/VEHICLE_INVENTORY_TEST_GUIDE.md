# Vehicle Inventory CRUD Test Guide

This guide provides comprehensive testing instructions for the Vehicle Inventory system, covering both Manufacturers and Models CRUD operations.

## 🚗 Overview

The Vehicle Inventory system includes:

- **Manufacturers**: Vehicle companies (Maruti, Hyundai, Tata, etc.)
- **Models**: Vehicle models (Swift, Creta, Nexon, etc.)
- **Commercial Vehicle Detection**: Automatic field population for commercial vehicles

## 📋 Test Files

### 1. Manufacturer Tests

- **File**: `test/vehicle-inventory-manufacturers.e2e-spec.ts`
- **Coverage**: Full CRUD operations for manufacturers
- **Features Tested**:
  - Create manufacturer
  - Read manufacturers (with filters)
  - Update manufacturer
  - Delete manufacturer
  - Validation and error handling

### 2. Model Tests

- **File**: `test/vehicle-inventory-models.e2e-spec.ts`
- **Coverage**: Full CRUD operations for vehicle models
- **Features Tested**:
  - Create regular vehicle models
  - Create commercial vehicle models
  - Read models (with advanced filtering)
  - Update models
  - Delete models
  - Commercial vehicle metadata validation

## 🛠️ Running Tests

### Prerequisites

1. **Application Running**: Ensure your NestJS application is running

   ```bash
   npm run start:dev
   ```

2. **Database Setup**: Ensure MongoDB is running and accessible

3. **Authentication**: Ensure you have valid admin credentials for testing

### Method 1: Using the Shell Script (Recommended)

```bash
# Make script executable (if not already)
chmod +x test/test-vehicle-inventory.sh

# Run the tests
./test/test-vehicle-inventory.sh
```

### Method 2: Using Jest Directly

```bash
# Run manufacturer tests
npx jest test/vehicle-inventory-manufacturers.e2e-spec.ts --config=jest-e2e.json --verbose

# Run model tests
npx jest test/vehicle-inventory-models.e2e-spec.ts --config=jest-e2e.json --verbose

# Run all vehicle inventory tests
npx jest test/vehicle-inventory-*.e2e-spec.ts --config=jest-e2e.json --verbose
```

### Method 3: Using the Test Runner

```bash
# Run the Node.js test runner
node test/run-vehicle-inventory-tests.js
```

## 🧪 Test Scenarios

### Manufacturer Tests

#### 1. Create Manufacturer

```typescript
POST /vehicle-inventory/manufacturers
{
  "name": "test-manufacturer",
  "displayName": "Test Manufacturer",
  "originCountry": "India",
  "description": "A test manufacturer",
  "logo": "https://example.com/logo.png",
  "website": "https://www.testmanufacturer.com",
  "foundedYear": 1990,
  "headquarters": "Mumbai, India"
}
```

**Tests**:

- ✅ Valid manufacturer creation
- ❌ Duplicate name validation
- ❌ Invalid data validation
- ❌ Invalid logo URL validation

#### 2. Read Manufacturers

```typescript
GET /vehicle-inventory/manufacturers
GET /vehicle-inventory/manufacturers?search=Test
GET /vehicle-inventory/manufacturers?originCountry=India
GET /vehicle-inventory/manufacturers?category=passenger_car
GET /vehicle-inventory/manufacturers?region=Asia
GET /vehicle-inventory/manufacturers?page=1&limit=10
```

**Tests**:

- ✅ Get all manufacturers
- ✅ Search by name
- ✅ Filter by country
- ✅ Filter by category
- ✅ Filter by region
- ✅ Pagination

#### 3. Read Single Manufacturer

```typescript
GET /vehicle-inventory/manufacturers/:id
```

**Tests**:

- ✅ Get manufacturer by ID
- ❌ Non-existent manufacturer
- ❌ Invalid ID format

#### 4. Update Manufacturer

```typescript
PUT /vehicle-inventory/manufacturers/:id
{
  "displayName": "Updated Manufacturer",
  "description": "Updated description",
  "website": "https://www.updatedmanufacturer.com"
}
```

**Tests**:

- ✅ Valid update
- ❌ Non-existent manufacturer
- ❌ Invalid update data

#### 5. Delete Manufacturer

```typescript
DELETE /vehicle-inventory/manufacturers/:id
```

**Tests**:

- ✅ Valid deletion
- ❌ Non-existent manufacturer
- ❌ Invalid ID format

### Model Tests

#### 1. Create Regular Vehicle Model

```typescript
POST /vehicle-inventory/models
{
  "name": "test-model",
  "displayName": "Test Model",
  "manufacturer": "manufacturer-id",
  "vehicleType": "HATCHBACK",
  "description": "A test vehicle model",
  "launchYear": 2020,
  "segment": "B",
  "bodyType": "Hatchback",
  "images": ["https://example.com/model1.jpg"],
  "brochureUrl": "https://example.com/brochure.pdf"
}
```

**Tests**:

- ✅ Valid model creation
- ❌ Duplicate name validation
- ❌ Invalid manufacturer validation
- ❌ Invalid vehicle type validation
- ❌ Missing required fields

#### 2. Create Commercial Vehicle Model

```typescript
POST /vehicle-inventory/models
{
  "name": "tata-407",
  "displayName": "Tata 407",
  "manufacturer": "manufacturer-id",
  "vehicleType": "TRUCK",
  "description": "Heavy duty commercial truck",
  "launchYear": 1986,
  "segment": "Commercial",
  "bodyType": "Truck",
  "isCommercialVehicle": true,
  "commercialVehicleType": "truck",
  "commercialBodyType": "flatbed",
  "defaultPayloadCapacity": 4000,
  "defaultPayloadUnit": "kg",
  "defaultAxleCount": 2,
  "defaultSeatingCapacity": 3
}
```

**Tests**:

- ✅ Valid commercial model creation
- ✅ Commercial vehicle metadata validation
- ✅ Default values validation

#### 3. Read Models

```typescript
GET /vehicle-inventory/models
GET /vehicle-inventory/models?search=Test
GET /vehicle-inventory/models?manufacturerId=manufacturer-id
GET /vehicle-inventory/models?vehicleType=HATCHBACK
GET /vehicle-inventory/models?segment=A
GET /vehicle-inventory/models?bodyType=Hatchback
GET /vehicle-inventory/models?minLaunchYear=2019&maxLaunchYear=2021
GET /vehicle-inventory/models?isCommercialVehicle=true
GET /vehicle-inventory/models?page=1&limit=10
```

**Tests**:

- ✅ Get all models
- ✅ Search by name
- ✅ Filter by manufacturer
- ✅ Filter by vehicle type
- ✅ Filter by segment
- ✅ Filter by body type
- ✅ Filter by launch year range
- ✅ Filter commercial vehicles
- ✅ Pagination

#### 4. Read Single Model

```typescript
GET /vehicle-inventory/models/:id
```

**Tests**:

- ✅ Get model by ID
- ❌ Non-existent model
- ❌ Invalid ID format

#### 5. Update Model

```typescript
PUT /vehicle-inventory/models/:id
{
  "displayName": "Updated Model",
  "description": "Updated description",
  "launchYear": 2021,
  "segment": "A",
  "bodyType": "Sedan"
}
```

**Tests**:

- ✅ Valid update
- ✅ Commercial vehicle update
- ❌ Non-existent model
- ❌ Invalid update data

#### 6. Delete Model

```typescript
DELETE /vehicle-inventory/models/:id
```

**Tests**:

- ✅ Valid deletion
- ❌ Non-existent model
- ❌ Invalid ID format

## 🔍 Test Coverage

### Manufacturer Coverage

- ✅ Create operations
- ✅ Read operations (single and multiple)
- ✅ Update operations
- ✅ Delete operations
- ✅ Validation and error handling
- ✅ Filtering and search
- ✅ Pagination

### Model Coverage

- ✅ Create operations (regular and commercial)
- ✅ Read operations (single and multiple)
- ✅ Update operations
- ✅ Delete operations
- ✅ Validation and error handling
- ✅ Advanced filtering
- ✅ Commercial vehicle metadata
- ✅ Pagination

## 🚨 Common Issues and Solutions

### 1. Authentication Issues

**Problem**: Tests fail with 401 Unauthorized
**Solution**: Ensure valid admin credentials in the test setup

### 2. Database Connection Issues

**Problem**: Tests fail with database connection errors
**Solution**: Ensure MongoDB is running and accessible

### 3. Application Not Running

**Problem**: Tests fail with connection refused
**Solution**: Start the application with `npm run start:dev`

### 4. Test Timeout Issues

**Problem**: Tests timeout before completion
**Solution**: Increase timeout in jest configuration or test setup

## 📊 Test Results

After running tests, you'll see:

- ✅ Passed tests in green
- ❌ Failed tests in red
- 📊 Coverage report (if enabled)
- 📋 Summary of results

## 🔧 Customization

### Adding New Tests

1. Add test cases to the appropriate spec file
2. Follow the existing pattern for consistency
3. Include both positive and negative test cases
4. Add proper error handling tests

### Modifying Test Data

1. Update the test data in the spec files
2. Ensure test data is realistic and valid
3. Include edge cases and boundary conditions

### Extending Test Coverage

1. Add tests for new endpoints
2. Include integration tests
3. Add performance tests if needed
4. Include security tests

## 📝 Best Practices

1. **Clean State**: Always clean up test data between tests
2. **Isolation**: Tests should be independent of each other
3. **Validation**: Test both valid and invalid inputs
4. **Error Handling**: Test error scenarios thoroughly
5. **Documentation**: Keep test documentation updated

## 🎯 Next Steps

1. Run the tests to verify functionality
2. Review test results and fix any failures
3. Add additional test cases as needed
4. Integrate tests into CI/CD pipeline
5. Monitor test coverage and improve as needed

---

**Note**: This test suite is designed to be comprehensive and should catch most issues with the Vehicle Inventory CRUD operations. Regular testing ensures the system remains stable and reliable.
