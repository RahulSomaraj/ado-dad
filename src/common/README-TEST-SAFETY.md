# 🛡️ Test Data Safety Framework

## Overview

This framework prevents hard database deletions and ensures tests only work with seeded test data. It provides multiple layers of protection against accidental data loss.

## 🚨 **Why This Framework Exists**

- **Prevents Data Loss**: Blocks hard database deletions in production/development
- **Test Isolation**: Ensures tests only affect test data, not production data
- **Audit Trail**: Logs all database operations for compliance
- **Environment Safety**: Different rules for different environments

## 🏗️ **Architecture**

### 1. **TestDataSafetyService** - Core Safety Engine

- Validates environment before destructive operations
- Creates safe filters for test data
- Logs all database operations
- Prevents production/staging deletions

### 2. **SafeTestDataManagerService** - Test Data Manager

- Registers and tracks test data
- Creates safe filters for operations
- Manages test data lifecycle
- Provides safe cleanup methods

### 3. **TestDataSafetyGuard** - Request Interceptor

- Intercepts HTTP requests
- Validates safety decorators
- Blocks unsafe operations
- Enforces test data markers

### 4. **SafeTestBaseClass** - Base Test Class

- Provides safe testing methods
- Inherits safety features
- Manages test data tracking
- Prevents accidental deletions

## 📝 **Usage Examples**

### **Basic Service Protection**

```typescript
import {
  TestDataSafe,
  NoHardDelete,
} from '../common/decorators/test-data-safety.decorators';

@Controller('ads')
export class AdsController {
  @Post('test-data')
  @TestDataSafe({
    collection: 'ads',
    prefix: 'Test',
    requireTestDataMarkers: true,
    allowHardDelete: false,
  })
  async createTestAd(@Body() adData: any) {
    // This method is protected and only works with test data
    return this.adsService.createTestAd(adData);
  }

  @Delete('cleanup')
  @NoHardDelete() // Blocks any deletion operations
  async cleanup() {
    // This will be blocked by the guard
    return this.adsService.cleanup();
  }
}
```

### **Safe Test Data Creation**

```typescript
import { SafeTestBaseClass } from '../common/base/safe-test-base.class';

export class AdsTestService extends SafeTestBaseClass {
  async createTestAd(adData: any) {
    // Creates test data with safety markers
    return await this.createSafeTestData('ads', this.adModel, adData, 'Test');
  }

  async findTestAds(filter: any = {}) {
    // Only finds test data using safe filters
    return await this.findSafeTestData('ads', this.adModel, filter);
  }

  async cleanupTestAds() {
    // Safely cleans up only test data
    return await this.deleteSafeTestData('ads', this.adModel);
  }
}
```

### **Test Data Markers**

```typescript
// Test data automatically gets these markers:
const testData = {
  title: 'Test Honda City',
  price: 500000,
  // ... other data

  // 🛡️ SAFETY MARKERS (automatically added)
  isTestData: true,
  testPrefix: 'Test',
  testId: 'Test_1703123456789_abc123def',
  testCreatedAt: '2025-01-09T10:21:56.789Z',
  testEnvironment: 'test',
};
```

## 🔒 **Safety Rules**

### **Environment Rules**

- **Production**: 🚫 NO destructive operations allowed
- **Staging**: 🚫 NO destructive operations allowed
- **Development**: ⚠️ Destructive operations with warnings
- **Test**: ✅ Destructive operations allowed (test data only)

### **Collection Protection**

- **Protected Collections**: Never allow deletion
  - `users`, `roles`, `permissions`, `system_config`
- **Restricted Collections**: Require special permission
  - `ads`, `properties`, `vehicles`, `transactions`

### **Operation Rules**

- **Blocked Operations**: Always blocked
  - `dropDatabase`, `dropCollection`, `removeAll`
- **Restricted Operations**: Require safety decorators
  - `deleteMany`, `removeMany`, `bulkDelete`
- **Safe Operations**: Always allowed
  - `find`, `findOne`, `count`, `aggregate`

## 🧪 **Testing Best Practices**

### **1. Always Use Safety Decorators**

```typescript
// ✅ GOOD: Protected method
@TestDataSafe({
  collection: 'ads',
  prefix: 'Test',
  requireTestDataMarkers: true,
  allowHardDelete: false
})
async createTestAd() { /* ... */ }

// ❌ BAD: No protection
async createTestAd() { /* ... */ }
```

### **2. Use Safe Test Base Class**

```typescript
// ✅ GOOD: Inherits safety features
export class AdsTestService extends SafeTestBaseClass {
  // All methods are automatically protected
}

// ❌ BAD: No safety inheritance
export class AdsTestService {
  // No automatic protection
}
```

### **3. Register Test Data**

```typescript
// ✅ GOOD: Register test data for tracking
const ad = await this.createSafeTestData('ads', this.adModel, adData, 'Test');
// Automatically registered and tracked

// ❌ BAD: Create without registration
const ad = await this.adModel.create(adData);
// Not tracked, could be accidentally deleted
```

### **4. Use Safe Cleanup**

```typescript
// ✅ GOOD: Safe cleanup of test data only
await this.deleteSafeTestData('ads', this.adModel);

// ❌ BAD: Hard deletion (will be blocked)
await this.adModel.deleteMany({});
```

## 🚨 **Common Mistakes to Avoid**

### **1. Hard Deletions in beforeEach/afterEach**

```typescript
// ❌ BAD: This will delete ALL data
beforeEach(async () => {
  await this.adModel.deleteMany({}); // BLOCKED!
});

// ✅ GOOD: Safe cleanup of test data only
beforeEach(async () => {
  await this.deleteSafeTestData('ads', this.adModel);
});
```

### **2. Missing Test Data Markers**

```typescript
// ❌ BAD: No test markers
const adData = {
  title: 'Honda City',
  price: 500000,
};

// ✅ GOOD: With test markers
const adData = this.safeTestDataManager.createTestDataWithMarkers(
  {
    title: 'Honda City',
    price: 500000,
  },
  'Test',
);
```

### **3. Ignoring Environment Checks**

```typescript
// ❌ BAD: No environment validation
async cleanup() {
  await this.adModel.deleteMany({}); // Could run in production!
}

// ✅ GOOD: Environment validated
@TestDataSafe({
  collection: 'ads',
  prefix: 'Test',
  requireTestDataMarkers: true,
  allowHardDelete: true
})
async cleanup() {
  // Environment automatically validated
  await this.deleteSafeTestData('ads', this.adModel);
}
```

## 🔧 **Configuration**

### **Environment Variables**

```bash
# Set environment
NODE_ENV=test

# Emergency override (if needed)
EMERGENCY_OVERRIDE_TOKEN=your-secure-token
```

### **Configuration File**

```typescript
// src/common/config/test-safety.config.ts
export default registerAs('testSafety', () => ({
  environment: {
    blockedEnvironments: ['production', 'staging'],
    allowedEnvironments: ['test', 'development'],
  },
  // ... other config
}));
```

## 📊 **Monitoring and Auditing**

### **Log Examples**

```
✅ Test environment: Safe to perform deleteMany on ads
🛡️ Safety filter applied: deleteMany on ads will only affect test data
🧹 Safe cleanup completed for ads: 5 test records deleted
📊 Database operation audited: cleanupTestAds
```

### **Audit Trail**

- All database operations logged
- Test data operations tracked
- Safety violations recorded
- Environment changes monitored

## 🆘 **Emergency Overrides**

### **When to Use**

- **NEVER** in production
- Only for critical development issues
- Requires secure token
- Time-limited (15 minutes)

### **How to Use**

```bash
# Set emergency token
export EMERGENCY_OVERRIDE_TOKEN=your-secure-token

# Run with override
NODE_ENV=development EMERGENCY_OVERRIDE_TOKEN=your-token npm run start:dev
```

## 🎯 **Migration Guide**

### **From Unsafe Tests**

```typescript
// OLD: Unsafe
beforeEach(async () => {
  await this.adModel.deleteMany({});
});

// NEW: Safe
beforeEach(async () => {
  await this.deleteSafeTestData('ads', this.adModel);
});
```

### **From Hard Deletions**

```typescript
// OLD: Hard deletion
await this.adModel.deleteMany({ title: { $regex: /^Test/ } });

// NEW: Safe deletion
await this.deleteSafeTestData('ads', this.adModel, {
  title: { $regex: /^Test/ },
});
```

## 🏆 **Benefits**

1. **🛡️ Data Protection**: Never lose production data again
2. **🧪 Test Isolation**: Tests only affect test data
3. **📊 Audit Trail**: Complete operation logging
4. **🔒 Environment Safety**: Different rules per environment
5. **⚡ Easy Migration**: Simple decorator-based protection
6. **🔄 Auto Cleanup**: Automatic test data management
7. **🚨 Violation Prevention**: Blocks unsafe operations

## 📞 **Support**

If you encounter issues:

1. Check the logs for safety violations
2. Ensure proper decorators are used
3. Verify environment settings
4. Use safe test base class methods
5. Contact the team for assistance

---

**Remember: Safety First! 🛡️ Always use the safety framework to protect your data.**
