# 🛡️ Safe Vehicle Inventory Seeding Guide

## Overview

This guide explains how to use the **Safe Vehicle Inventory Seed Services** that leverage our **Test Data Safety Framework** to prevent hard database deletions and ensure secure data seeding for manufacturers, fuel types, and transmission types.

## 🚀 **Quick Start Commands**

### **1. Safe Manufacturer Seeding**

```bash
npm run seed:manufacturers:safe
```

### **2. Safe Fuel Types Seeding**

```bash
npm run seed:fuel-types:safe
```

### **3. Safe Transmission Types Seeding**

```bash
npm run seed:transmission-types:safe
```

## 🏗️ **Architecture Overview**

### **Safe Seed Services**

- **`SafeManufacturerSeedService`** - Seeds 35 manufacturers (Indian + International)
- **`SafeFuelTypeSeedService`** - Seeds 20 fuel types (Petrol, Diesel, Electric, Hybrid, etc.)
- **`SafeTransmissionTypeSeedService`** - Seeds 25 transmission types (Manual, Automatic, CVT, DCT, etc.)

### **Test Data Safety Framework Integration**

- **Environment Validation** - Ensures seeding only happens in safe environments
- **Safety Markers** - All seeded data gets unique test identifiers
- **Data Tracking** - Complete audit trail of all operations
- **Safe Cleanup** - Methods to safely remove test data without affecting production data

## 📊 **Data Coverage**

### **Manufacturers (35 total)**

- **India**: 10 manufacturers (Maruti Suzuki, Tata Motors, Mahindra, Hero MotoCorp, etc.)
- **Japan**: 7 manufacturers (Honda, Toyota, Nissan, Mitsubishi, Suzuki, Yamaha, Kawasaki)
- **South Korea**: 2 manufacturers (Hyundai, Kia)
- **Germany**: 4 manufacturers (Volkswagen, BMW, Mercedes-Benz, Audi)
- **United States**: 3 manufacturers (Ford, Chevrolet, Harley-Davidson)
- **Italy**: 1 manufacturer (Ducati)
- **United Kingdom**: 1 manufacturer (Triumph)

### **Fuel Types (20 total)**

- **Liquid Fuels**: 10 types (Petrol variants, Diesel variants, Biofuels, Alcohols)
- **Gas Fuels**: 3 types (CNG, LPG, Hydrogen)
- **Electric**: 1 type (Battery Electric)
- **Hybrid**: 3 types (Petrol-Electric, Diesel-Electric, Plug-in Hybrid)
- **Specialized**: 3 types (Ethanol, Methanol, Kerosene)

### **Transmission Types (25 total)**

- **Manual**: 3 types (5, 6, 7-speed)
- **Automatic**: 6 types (4, 5, 6, 8, 9, 10-speed)
- **CVT**: 2 types (Standard, Sport)
- **Semi-Automatic**: 2 types (5, 6-speed)
- **Dual-Clutch**: 3 types (6, 7, 8-speed)
- **Electric**: 2 types (Single-speed, Two-speed)
- **Specialized**: 7 types (Sequential, Automated Manual, etc.)

## 🛡️ **Safety Features**

### **1. Environment Validation**

- ✅ Validates NODE_ENV before seeding
- ✅ Prevents seeding in production environments
- ✅ Logs all validation checks

### **2. Test Data Markers**

- ✅ Unique test identifiers for all seeded data
- ✅ Prefix-based categorization (e.g., "Seed")
- ✅ Easy identification and filtering

### **3. Data Tracking & Audit**

- ✅ Complete registration of all test data
- ✅ Operation logging with timestamps
- ✅ Safe filter creation for queries
- ✅ Count-based integrity validation

### **4. Safe Cleanup Methods**

- ✅ `cleanupSeededManufacturers()` - Safe removal of manufacturer test data
- ✅ `cleanupSeededFuelTypes()` - Safe removal of fuel type test data
- ✅ `cleanupSeededTransmissionTypes()` - Safe removal of transmission type test data

## 🔧 **Usage Examples**

### **Basic Seeding**

```typescript
// Get the service from your module
const safeManufacturerSeedService = app.get(SafeManufacturerSeedService);

// Seed manufacturers safely
await safeManufacturerSeedService.seedManufacturers();

// Validate integrity
const isValid =
  await safeManufacturerSeedService.validateManufacturerIntegrity();
```

### **Safe Data Queries**

```typescript
// Get only seeded data
const seededManufacturers =
  await safeManufacturerSeedService.listSeededManufacturers();

// Get count of seeded data
const count = await safeManufacturerSeedService.getSeededManufacturerCount();
```

### **Safe Cleanup**

```typescript
// Safely remove all seeded data
const result = await safeManufacturerSeedService.cleanupSeededManufacturers();
console.log(`Removed ${result.deletedCount} test records`);
```

## 📋 **Available Methods**

### **SafeManufacturerSeedService**

- `seedManufacturers()` - Seeds all manufacturers with safety markers
- `cleanupSeededManufacturers()` - Safely removes seeded manufacturer data
- `getSeededManufacturerCount()` - Returns count of seeded manufacturers
- `listSeededManufacturers()` - Lists all seeded manufacturers
- `validateManufacturerIntegrity()` - Validates data integrity

### **SafeFuelTypeSeedService**

- `seedFuelTypes()` - Seeds all fuel types with safety markers
- `cleanupSeededFuelTypes()` - Safely removes seeded fuel type data
- `getSeededFuelTypeCount()` - Returns count of seeded fuel types
- `listSeededFuelTypes()` - Lists all seeded fuel types
- `validateFuelTypeIntegrity()` - Validates data integrity

### **SafeTransmissionTypeSeedService**

- `seedTransmissionTypes()` - Seeds all transmission types with safety markers
- `cleanupSeededTransmissionTypes()` - Safely removes seeded transmission type data
- `getSeededTransmissionTypeCount()` - Returns count of seeded transmission types
- `listSeededTransmissionTypes()` - Lists all seeded transmission types
- `validateTransmissionTypeIntegrity()` - Validates data integrity

## 🚨 **Error Handling**

### **Common Issues & Solutions**

1. **Environment Validation Failed**

   - Ensure NODE_ENV is set to 'development' or 'test'
   - Check environment configuration

2. **Database Connection Issues**

   - Verify MongoDB connection string
   - Check network connectivity

3. **Duplicate Key Errors**

   - Services automatically handle existing data
   - Data is reused if already present

4. **Integrity Check Warnings**
   - Expected vs actual count mismatches are logged
   - Services continue operation with warnings

## 🔍 **Monitoring & Debugging**

### **Log Levels**

- **INFO**: General seeding progress and results
- **DEBUG**: Detailed operation tracking and filter creation
- **WARN**: Integrity check warnings and non-critical issues
- **ERROR**: Critical failures and validation errors

### **Audit Trail**

- All operations are logged with timestamps
- Test data registration details are captured
- Safe filter creation is logged for debugging
- Cleanup operations are fully audited

## 🚀 **Advanced Usage**

### **Custom Seeding**

```typescript
// Create custom manufacturer data
const customManufacturer = {
  name: 'custom_brand',
  displayName: 'Custom Brand',
  originCountry: 'Custom',
  description: 'Custom manufacturer description',
  // ... other fields
};

// Add safety markers and save
const safeData = safeTestDataManager.createTestDataWithMarkers(
  customManufacturer,
  'CustomSeed',
);
```

### **Batch Operations**

```typescript
// Seed multiple types in sequence
await safeManufacturerSeedService.seedManufacturers();
await safeFuelTypeSeedService.seedFuelTypes();
await safeTransmissionTypeSeedService.seedTransmissionTypes();

// Validate all
const allValid = await Promise.all([
  safeManufacturerSeedService.validateManufacturerIntegrity(),
  safeFuelTypeSeedService.validateFuelTypeIntegrity(),
  safeTransmissionTypeSeedService.validateTransmissionTypeIntegrity(),
]);
```

## 📚 **Related Documentation**

- **Test Data Safety Framework**: `docs/test-data-safety-framework.md`
- **Safe Test Base Class**: `src/common/base/safe-test-base.class.ts`
- **Safety Decorators**: `src/common/decorators/test-data-safety.decorators.ts`
- **Safety Configuration**: `src/common/config/test-safety.config.ts`

## 🎯 **Best Practices**

1. **Always use safe seeding services** instead of direct database operations
2. **Validate data integrity** after seeding operations
3. **Use safe cleanup methods** when removing test data
4. **Monitor logs** for any warnings or errors
5. **Register custom test data** with the safety framework
6. **Use environment-specific configurations** for different deployment stages

## 🆘 **Support & Troubleshooting**

If you encounter issues:

1. Check the logs for detailed error messages
2. Verify environment configuration
3. Ensure database connectivity
4. Check for duplicate data conflicts
5. Review the Test Data Safety Framework documentation

---

**🛡️ Remember: These services are designed to prevent data loss and ensure safe testing practices. Always use them instead of direct database operations!**
