# Vehicle Inventory Seed Data Guide

This guide explains how to populate the initial data for the vehicle inventory system.

## 🚀 Quick Start

### Method 1: Using npm script (Recommended)

```bash
npm run seed
```

### Method 2: Using ts-node directly

```bash
npx ts-node src/vehicle-inventory/seed/seed-script.ts
```

### Method 3: Using the compiled JavaScript

```bash
# First build the project
npm run build

# Then run the compiled seed script
node dist/vehicle-inventory/seed/seed-script.js
```

## 📊 What Gets Seeded

The seed script will populate the following data:

### 1. Fuel Types

- **Petrol** - Conventional petrol fuel
- **Diesel** - Conventional diesel fuel
- **CNG** - Compressed Natural Gas
- **Electric** - Battery Electric Vehicle
- **Hybrid** - Hybrid Electric Vehicle
- **Plugin Hybrid** - Plugin Hybrid Electric Vehicle
- **Flex Fuel** - Flexible Fuel Vehicle

### 2. Transmission Types

- **Manual** - Manual transmission (MT)
- **Automatic** - Automatic transmission (AT)
- **AMT** - Automated Manual Transmission
- **CVT** - Continuously Variable Transmission
- **Dual-Clutch** - Dual-Clutch Transmission (DCT)
- **Semi-Automatic** - Semi-Automatic Transmission (SAT)
- **IMT** - Intelligent Manual Transmission

## 🔧 Prerequisites

Before running the seed script, ensure:

1. **MongoDB is running** and accessible
2. **Environment variables** are properly configured
3. **Database connection** is established
4. **Dependencies are installed** (`npm install`)

## 📝 Expected Output

When you run the seed script successfully, you should see:

```
🚀 Starting seed data population...
Created fuel type: Petrol
Created fuel type: Diesel
Created fuel type: CNG
Created fuel type: Electric
Created fuel type: Hybrid
Created fuel type: Plugin Hybrid
Created fuel type: Flex Fuel
Created transmission type: Manual
Created transmission type: Automatic
Created transmission type: AMT
Created transmission type: CVT
Created transmission type: Dual-Clutch
Created transmission type: Semi-Automatic
Created transmission type: IMT
✅ Seed data population completed successfully!
```

## 🔍 Verification

After running the seed script, you can verify the data was created by:

### 1. Using the API endpoints

```bash
# Get all fuel types
curl -X GET "http://localhost:3000/vehicle-inventory/fuel-types" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get all transmission types
curl -X GET "http://localhost:3000/vehicle-inventory/transmission-types" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Using MongoDB Compass or mongo shell

```javascript
// Connect to your database
use your_database_name

// Check fuel types
db.fueltypes.find({ isDeleted: false })

// Check transmission types
db.transmissiontypes.find({ isDeleted: false })
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Module not found" error

```bash
# Make sure you're in the project root directory
cd /path/to/your/project

# Install dependencies
npm install
```

#### 2. "MongoDB connection failed" error

```bash
# Check if MongoDB is running
# On Windows:
net start MongoDB

# On macOS/Linux:
sudo systemctl start mongod
```

#### 3. "Permission denied" error

```bash
# Make sure you have write permissions to the database
# Check your MongoDB user permissions
```

#### 4. "Duplicate key error"

This is normal if you run the seed script multiple times. The script is idempotent and will skip existing records.

## 🔄 Re-running Seed Data

The seed script is **idempotent**, meaning:

- ✅ Safe to run multiple times
- ✅ Won't create duplicate records
- ✅ Will skip existing data
- ✅ Won't overwrite existing data

### To force re-seed (clear and recreate):

```javascript
// In MongoDB shell or Compass
db.fueltypes.deleteMany({})
db.transmissiontypes.deleteMany({})

// Then run the seed script again
npm run seed
```

## 📋 Manual Data Entry

If you prefer to manually add data, you can use the API endpoints:

### Add a Fuel Type

```bash
curl -X POST "http://localhost:3000/vehicle-inventory/fuel-types" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Hydrogen",
    "displayName": "Hydrogen Fuel Cell",
    "description": "Hydrogen fuel cell technology",
    "icon": "fuel-hydrogen",
    "color": "#00FF00",
    "sortOrder": 8
  }'
```

### Add a Transmission Type

```bash
curl -X POST "http://localhost:3000/vehicle-inventory/transmission-types" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "EVT",
    "displayName": "EVT",
    "description": "Electric Variable Transmission",
    "icon": "transmission-evt",
    "abbreviation": "EVT",
    "sortOrder": 8
  }'
```

## 🎯 Next Steps

After running the seed data:

1. **Create Manufacturers** - Add vehicle companies like Maruti, Hyundai, Tata
2. **Create Vehicle Models** - Add models like Swift, Creta, Nexon
3. **Create Vehicle Variants** - Add specific variants with detailed specifications
4. **Test the APIs** - Verify all endpoints work correctly

## 📞 Support

If you encounter any issues:

1. Check the console output for error messages
2. Verify your MongoDB connection
3. Ensure all environment variables are set
4. Check the application logs for more details
