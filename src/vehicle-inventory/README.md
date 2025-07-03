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
- `seatingCapacity`, `colors`, `images`: Additional variant info

### 4. Fuel Type (Lookup)

Reusable lookup for fuel types.

**Key Fields:**

- `name` (unique): Internal identifier
- `displayName`: User-friendly name
- `description`, `icon`, `color`: UI representation
- `sortOrder`: For dropdown ordering

### 5. Transmission Type (Lookup)

Reusable lookup for transmission types.

**Key Fields:**

- `name` (unique): Internal identifier
- `displayName`: User-friendly name
- `abbreviation`: MT, AT, AMT, etc.
- `description`, `icon`, `sortOrder`: UI representation

## 🔍 Key Features

### 1. Advanced Querying

The system supports complex queries as per requirements:

```typescript
// List all Diesel variants of Creta
GET /vehicle-inventory/variants/diesel/creta

// Show all CNG variants under ₹8 Lakh
GET /vehicle-inventory/variants/cng/under-price?maxPrice=800000

// Which models does Maruti offer in both Petrol & CNG?
GET /vehicle-inventory/manufacturers/{manufacturerId}/models/multiple-fuel-types
```

### 2. Flexible Filtering

```typescript
// Get variants with multiple filters
GET /vehicle-inventory/variants?modelId=123&fuelTypeId=456&maxPrice=1000000

// Search variants by name
GET /vehicle-inventory/variants/search?q=swift

// Get price range
GET /vehicle-inventory/price-range
```

### 3. Extensible Design

- **Lookup Tables**: Fuel types and transmission types can be easily extended
- **Soft Delete**: All entities support soft deletion
- **Indexes**: Optimized for fast lookups
- **Validation**: Comprehensive input validation

## 🛠️ API Endpoints

### Manufacturers

- `POST /vehicle-inventory/manufacturers` - Create manufacturer
- `GET /vehicle-inventory/manufacturers` - Get all manufacturers
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

### 2. Creating a Vehicle Model

```json
POST /vehicle-inventory/models
{
  "name": "swift",
  "displayName": "Swift",
  "manufacturer": "507f1f77bcf86cd799439011",
  "vehicleType": "HATCHBACK",
  "description": "Popular hatchback with excellent fuel efficiency",
  "launchYear": 2005,
  "segment": "B",
  "bodyType": "Hatchback",
  "images": ["https://example.com/swift1.jpg"]
}
```

### 3. Creating a Vehicle Variant

```json
POST /vehicle-inventory/variants
{
  "name": "swift-lxi-petrol-manual",
  "displayName": "Swift LXi Petrol Manual",
  "vehicleModel": "507f1f77bcf86cd799439012",
  "fuelType": "507f1f77bcf86cd799439013",
  "transmissionType": "507f1f77bcf86cd799439014",
  "featurePackage": "LX",
  "engineSpecs": {
    "capacity": 1200,
    "maxPower": 88,
    "maxTorque": 113,
    "cylinders": 4,
    "turbocharged": false
  },
  "performanceSpecs": {
    "mileage": 22.38,
    "acceleration": 12.5,
    "topSpeed": 165,
    "fuelCapacity": 37
  },
  "dimensions": {
    "length": 3840,
    "width": 1735,
    "height": 1530,
    "wheelbase": 2450,
    "groundClearance": 163,
    "bootSpace": 268
  },
  "seatingCapacity": 5,
  "price": 550000,
  "exShowroomPrice": 520000,
  "onRoadPrice": 620000,
  "colors": ["Pearl Arctic White", "Solid Fire Red"],
  "description": "Base variant with essential features"
}
```

## 🔧 Database Indexes

The system includes optimized indexes for fast queries:

### Manufacturer

- `{ name: 1 }` - Unique index on name
- `{ isActive: 1, isDeleted: 1 }` - Filter active manufacturers

### Vehicle Model

- `{ manufacturer: 1, name: 1 }` - Unique compound index
- `{ vehicleType: 1 }` - Filter by vehicle type
- `{ manufacturer: 1, isActive: 1 }` - Filter by manufacturer

### Vehicle Variant

- `{ vehicleModel: 1, fuelType: 1, transmissionType: 1, featurePackage: 1 }` - Unique compound index
- `{ fuelType: 1 }` - Filter by fuel type
- `{ price: 1 }` - Sort by price
- `{ fuelType: 1, price: 1 }` - Price-based queries
- `{ vehicleModel: 1, fuelType: 1 }` - Model + fuel type queries

### Lookup Tables

- `{ name: 1 }` - Unique index on name
- `{ sortOrder: 1 }` - Order in dropdowns

## 🚀 Getting Started

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Run Seed Data**

   ```bash
   # The seed data will automatically populate fuel types and transmission types
   ```

3. **Start the Application**

   ```bash
   npm run start:dev
   ```

4. **Access API Documentation**
   ```
   http://localhost:3000/api
   ```

## 🔒 Security & Authorization

- All endpoints require JWT authentication
- Admin/Super Admin roles required for create/update operations
- Read operations are available to authenticated users
- Input validation using class-validator
- SQL injection protection through Mongoose

## 📈 Scalability Features

- **Normalized Design**: Proper separation of concerns
- **Indexed Queries**: Fast lookups on common filters
- **Soft Delete**: Data preservation and audit trails
- **Extensible Lookups**: Easy to add new fuel types or transmission types
- **Pagination Ready**: Can be easily extended for large datasets
- **Caching Ready**: Structure supports Redis caching

## 🎯 Future Enhancements

- **Pagination**: For large datasets
- **Caching**: Redis integration for frequently accessed data
- **Image Management**: S3 integration for vehicle images
- **Price History**: Track price changes over time
- **Comparison Tools**: Compare multiple variants
- **Recommendation Engine**: Suggest vehicles based on preferences
- **Analytics**: Sales and popularity analytics
