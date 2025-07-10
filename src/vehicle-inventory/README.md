# Vehicle Inventory System for India

A comprehensive vehicle inventory management system designed specifically for the Indian automotive market, built with NestJS and MongoDB.

## 🚗 System Overview

This system provides a normalized, scalable data structure for managing:

- **Manufacturers** (e.g., Maruti, Hyundai, Tata)
- **Vehicle Models** (e.g., Swift, Creta, Nexon)
- **Vehicle Variants** with detailed specifications
- **Fuel Types** (Petrol, Diesel, CNG, Electric, etc.)
- **Transmission Types** (Manual, Automatic, AMT, etc.)

## 📊 Database Schema

### 1. Manufacturer

Represents vehicle companies like Maruti Suzuki, Hyundai, Tata Motors, etc.

**Key Fields:**

- `name` (unique): Internal identifier (e.g., "maruti-suzuki")
- `displayName`: User-friendly name (e.g., "Maruti Suzuki")
- `originCountry`: Country of origin
- `logo`: Company logo URL
- `website`, `foundedYear`, `headquarters`: Additional company info

### 2. Vehicle Model

Represents specific vehicle models like Swift, Creta, Nexon, etc.

**Key Fields:**

- `name` (unique): Internal identifier (e.g., "swift")
- `displayName`: User-friendly name (e.g., "Swift")
- `manufacturer`: Reference to Manufacturer
- `vehicleType`: SUV, Sedan, Hatchback, etc.
- `segment`: A, B, C, D, E segment classification
- `launchYear`, `bodyType`, `images`: Additional model info

**Commercial Vehicle Metadata (New):**

- `isCommercialVehicle`: Boolean flag for commercial vehicles
- `commercialVehicleType`: truck, bus, van, tractor, trailer, forklift
- `commercialBodyType`: flatbed, container, refrigerated, tanker, dump, pickup, box, passenger
- `defaultPayloadCapacity`: Default payload capacity
- `defaultPayloadUnit`: Default payload unit (kg, tons, etc.)
- `defaultAxleCount`: Default number of axles
- `defaultSeatingCapacity`: Default seating capacity

### 3. Vehicle Variant

Represents specific variants with detailed specifications.

**Key Fields:**

- `name` (unique): Internal identifier (e.g., "swift-lxi-petrol-manual")
- `displayName`: User-friendly name (e.g., "Swift LXi Petrol Manual")
- `vehicleModel`: Reference to Vehicle Model
- `fuelType`: Reference to Fuel Type
- `transmissionType`: Reference to Transmission Type
- `featurePackage`: LX, ZX, etc.
- `engineSpecs`: Capacity, power, torque, etc.
- `performanceSpecs`: Mileage, acceleration, etc.
- `dimensions`: Length, width, height, etc.
- `price`: Price in INR

## 🚛 Commercial Vehicle Detection Feature

### Overview

The system now includes automatic commercial vehicle detection when creating advertisements. When a vehicle model is marked as commercial or has a commercial vehicle type (like "Truck"), the system automatically:

1. **Detects commercial vehicles** based on model metadata
2. **Auto-populates commercial vehicle fields** when creating ads
3. **Sets the correct ad category** automatically
4. **Allows manual overrides** for custom values

### Creating Commercial Vehicle Models

When creating a vehicle model, you can now specify commercial vehicle metadata:

```json
POST /vehicle-inventory/models
{
  "name": "tata-407",
  "displayName": "Tata 407",
  "manufacturer": "507f1f77bcf86cd799439011",
  "vehicleType": "Truck",
  "description": "Heavy duty commercial truck for logistics",
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

### Automatic Field Population

When creating an ad with a commercial vehicle model, the system automatically populates:

- `commercialVehicleType`: Based on model metadata
- `bodyType`: Based on model metadata
- `payloadCapacity`: Default value from model
- `payloadUnit`: Default value from model
- `axleCount`: Default value from model
- `seatingCapacity`: Default value from model

### Example: Creating Commercial Vehicle Ad

**Minimal Input (Auto-populated):**

```json
POST /ads
{
  "category": "commercial_vehicle",
  "data": {
    "description": "Tata 407 truck for sale",
    "price": 850000,
    "location": "Mumbai, Maharashtra",
    "modelId": "507f1f77bcf86cd799439012", // Commercial vehicle model
    "year": 2018,
    "mileage": 125000,
    "transmissionTypeId": "507f1f77bcf86cd799439014",
    "fuelTypeId": "507f1f77bcf86cd799439015",
    "color": "White"
    // Commercial vehicle fields are auto-populated
  }
}
```

**Result (Auto-populated fields):**

```json
{
  "commercialVehicleType": "truck",
  "bodyType": "flatbed",
  "payloadCapacity": 4000,
  "payloadUnit": "kg",
  "axleCount": 2,
  "seatingCapacity": 3
}
```

**Manual Override:**

```json
POST /ads
{
  "category": "commercial_vehicle",
  "data": {
    "description": "Custom configured truck",
    "price": 850000,
    "location": "Mumbai, Maharashtra",
    "modelId": "507f1f77bcf86cd799439012",
    "year": 2018,
    "mileage": 125000,
    "transmissionTypeId": "507f1f77bcf86cd799439014",
    "fuelTypeId": "507f1f77bcf86cd799439015",
    "color": "White",
    "payloadCapacity": 6000, // Manual override
    "payloadUnit": "tons", // Manual override
    "axleCount": 3 // Manual override
  }
}
```

## 🛣️ API Endpoints

### Manufacturers

- `POST /vehicle-inventory/manufacturers` - Create manufacturer
- `GET /vehicle-inventory/manufacturers` - Get all manufacturers (with filters)
- `GET /vehicle-inventory/manufacturers/:id` - Get manufacturer by ID

### Vehicle Models

- `POST /vehicle-inventory/models` - Create vehicle model
- `GET /vehicle-inventory/models` - Get all models (with manufacturer filter)
- `GET /vehicle-inventory/models/:id` - Get model by ID

### Vehicle Variants

- `POST /vehicle-inventory/variants` - Create vehicle variant
- `GET /vehicle-inventory/variants` - Get all variants (with filters)
- `GET /vehicle-inventory/variants/:id` - Get variant by ID
- `GET /vehicle-inventory/variants/search?q=query` - Search variants

### Advanced Queries

- `GET /vehicle-inventory/variants/diesel/:modelName` - Diesel variants by model
- `GET /vehicle-inventory/variants/cng/under-price?maxPrice=800000` - CNG variants under price
- `GET /vehicle-inventory/manufacturers/:id/models/multiple-fuel-types` - Models with multiple fuel types

### Lookups

- `GET /vehicle-inventory/fuel-types` - Get all fuel types
- `GET /vehicle-inventory/transmission-types` - Get all transmission types

### Utilities

- `GET /vehicle-inventory/price-range` - Get price range

## 📝 Usage Examples

### 1. Creating a Manufacturer

```json
POST /vehicle-inventory/manufacturers
{
  "name": "maruti-suzuki",
  "displayName": "Maruti Suzuki",
  "originCountry": "Japan",
  "description": "Leading automobile manufacturer in India",
  "logo": "https://example.com/maruti-logo.png",
  "website": "https://www.marutisuzuki.com",
  "foundedYear": 1981,
  "headquarters": "New Delhi, India"
}
```

### 2. Creating a Commercial Vehicle Model

```json
POST /vehicle-inventory/models
{
  "name": "tata-407",
  "displayName": "Tata 407",
  "manufacturer": "507f1f77bcf86cd799439011",
  "vehicleType": "Truck",
  "description": "Heavy duty commercial truck for logistics and transportation",
  "launchYear": 1986,
  "segment": "Commercial",
  "bodyType": "Truck",
  "images": ["https://example.com/tata407.jpg"],
  "isCommercialVehicle": true,
  "commercialVehicleType": "truck",
  "commercialBodyType": "flatbed",
  "defaultPayloadCapacity": 4000,
  "defaultPayloadUnit": "kg",
  "defaultAxleCount": 2,
  "defaultSeatingCapacity": 3
}
```

### 3. Creating a Vehicle Variant

```json
POST /vehicle-inventory/variants
{
  "name": "swift-lxi-petrol-manual",
  "displayName": "Swift LXi Petrol Manual",
  "vehicleModel": "507f1f77bcf86cd799439011",
  "fuelType": "507f1f77bcf86cd799439012",
  "transmissionType": "507f1f77bcf86cd799439013",
  "featurePackage": "LX",
  "engineSpecs": {
    "capacity": 1197,
    "power": 82,
    "torque": 113,
    "cylinders": 4
  },
  "performanceSpecs": {
    "mileage": 22.4,
    "acceleration": 12.5,
    "topSpeed": 165
  },
  "seatingCapacity": 5,
  "price": 550000
}
```

## 🎯 Benefits of Commercial Vehicle Detection

1. **Reduced User Input Errors**: Automatic field population reduces manual entry mistakes
2. **Faster Ad Creation**: Users don't need to fill in all commercial vehicle fields manually
3. **Data Consistency**: Ensures consistent commercial vehicle specifications across ads
4. **Flexibility**: Manual overrides allow customization when needed
5. **Automatic Category Detection**: System automatically identifies commercial vehicle ads

## 🔧 Technical Implementation

The commercial vehicle detection feature includes:

- **CommercialVehicleDetectionService**: Handles detection and mapping logic
- **Enhanced VehicleModel Schema**: Includes commercial vehicle metadata fields
- **Auto-population Logic**: Automatically fills commercial vehicle fields during ad creation
- **Validation Updates**: Flexible validation that allows auto-populated fields
- **Manual Override Support**: Users can override auto-populated values

This system provides a comprehensive vehicle inventory management solution with intelligent commercial vehicle detection and automatic field population for improved user experience.
