# Vehicle Inventory System - ER Diagram

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    VEHICLE INVENTORY SYSTEM                                      │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    MANUFACTURER                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ _id (PK)                    │ ObjectId │ Primary Key                                            │
│ name                        │ String   │ Unique identifier (e.g., "maruti-suzuki")              │
│ displayName                 │ String   │ User-friendly name (e.g., "Maruti Suzuki")             │
│ originCountry               │ String   │ Country of origin                                      │
│ description                 │ String   │ Optional description                                   │
│ logo                        │ String   │ Logo URL                                               │
│ website                     │ String   │ Company website                                        │
│ foundedYear                 │ Number   │ Year founded                                           │
│ headquarters                │ String   │ Headquarters location                                  │
│ isActive                    │ Boolean  │ Whether manufacturer is active                         │
│ isDeleted                   │ Boolean  │ Soft delete flag                                       │
│ deletedAt                   │ Date     │ Soft delete timestamp                                  │
│ createdAt                   │ Date     │ Creation timestamp                                     │
│ updatedAt                   │ Date     │ Last update timestamp                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ 1:N
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    VEHICLE MODEL                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ _id (PK)                    │ ObjectId │ Primary Key                                            │
│ name                        │ String   │ Unique identifier (e.g., "swift")                      │
│ displayName                 │ String   │ User-friendly name (e.g., "Swift")                     │
│ manufacturer (FK)           │ ObjectId │ Reference to Manufacturer._id                         │
│ vehicleType                 │ Enum     │ SUV, SEDAN, HATCHBACK, etc.                           │
│ description                 │ String   │ Optional description                                   │
│ launchYear                  │ Number   │ Year launched                                          │
│ segment                     │ String   │ A, B, C, D, E segment                                  │
│ bodyType                    │ String   │ Hatchback, Sedan, SUV, etc.                           │
│ images                      │ [String] │ Array of image URLs                                    │
│ brochureUrl                 │ String   │ Brochure URL                                           │
│ isActive                    │ Boolean  │ Whether model is active                                │
│ isDeleted                   │ Boolean  │ Soft delete flag                                       │
│ deletedAt                   │ Date     │ Soft delete timestamp                                  │
│ createdAt                   │ Date     │ Creation timestamp                                     │
│ updatedAt                   │ Date     │ Last update timestamp                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ 1:N
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    VEHICLE VARIANT                                               │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ _id (PK)                    │ ObjectId │ Primary Key                                            │
│ name                        │ String   │ Unique identifier (e.g., "swift-lxi-petrol-manual")     │
│ displayName                 │ String   │ User-friendly name (e.g., "Swift LXi Petrol Manual")   │
│ vehicleModel (FK)           │ ObjectId │ Reference to VehicleModel._id                         │
│ fuelType (FK)               │ ObjectId │ Reference to FuelType._id                             │
│ transmissionType (FK)       │ ObjectId │ Reference to TransmissionType._id                     │
│ featurePackage              │ Enum     │ BASE, LX, ZX, etc.                                    │
│ engineSpecs                 │ Object   │ Embedded document:                                    │
│   ├─ capacity               │ Number   │ Engine capacity in cc                                 │
│   ├─ maxPower               │ Number   │ Maximum power in bhp                                  │
│   ├─ maxTorque              │ Number   │ Maximum torque in Nm                                  │
│   ├─ cylinders              │ Number   │ Number of cylinders                                   │
│   └─ turbocharged           │ Boolean  │ Whether turbocharged                                  │
│ performanceSpecs            │ Object   │ Embedded document:                                    │
│   ├─ mileage                │ Number   │ Fuel efficiency km/l or km/kWh                       │
│   ├─ acceleration           │ Number   │ 0-100 km/h time in seconds                           │
│   ├─ topSpeed               │ Number   │ Top speed in km/h                                     │
│   └─ fuelCapacity           │ Number   │ Fuel tank capacity in liters/kWh                      │
│ dimensions                  │ Object   │ Embedded document:                                    │
│   ├─ length                 │ Number   │ Vehicle length in mm                                  │
│   ├─ width                  │ Number   │ Vehicle width in mm                                   │
│   ├─ height                 │ Number   │ Vehicle height in mm                                  │
│   ├─ wheelbase              │ Number   │ Wheelbase in mm                                       │
│   ├─ groundClearance        │ Number   │ Ground clearance in mm                                │
│   └─ bootSpace              │ Number   │ Boot space in liters                                  │
│ seatingCapacity             │ Number   │ Number of seats                                       │
│ price                       │ Number   │ Price in INR                                          │
│ exShowroomPrice             │ Number   │ Ex-showroom price in INR                              │
│ onRoadPrice                 │ Number   │ On-road price in INR                                  │
│ colors                      │ [String] │ Array of available colors                             │
│ images                      │ [String] │ Array of image URLs                                    │
│ description                 │ String   │ Optional description                                   │
│ brochureUrl                 │ String   │ Brochure URL                                           │
│ videoUrl                    │ String   │ Video URL                                              │
│ isActive                    │ Boolean  │ Whether variant is active                              │
│ isLaunched                  │ Boolean  │ Whether variant is launched                           │
│ launchDate                  │ Date     │ Launch date                                            │
│ isDeleted                   │ Boolean  │ Soft delete flag                                       │
│ deletedAt                   │ Date     │ Soft delete timestamp                                  │
│ createdAt                   │ Date     │ Creation timestamp                                     │
│ updatedAt                   │ Date     │ Last update timestamp                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ N:1
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FUEL TYPE (Lookup)                                            │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ _id (PK)                    │ ObjectId │ Primary Key                                            │
│ name                        │ String   │ Unique identifier (e.g., "Petrol")                     │
│ displayName                 │ String   │ User-friendly name (e.g., "Petrol")                    │
│ description                 │ String   │ Optional description                                   │
│ icon                        │ String   │ Icon identifier                                        │
│ color                       │ String   │ Hex color for UI                                       │
│ isActive                    │ Boolean  │ Whether fuel type is active                            │
│ sortOrder                   │ Number   │ Order in dropdowns                                     │
│ isDeleted                   │ Boolean  │ Soft delete flag                                       │
│ deletedAt                   │ Date     │ Soft delete timestamp                                  │
│ createdAt                   │ Date     │ Creation timestamp                                     │
│ updatedAt                   │ Date     │ Last update timestamp                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    TRANSMISSION TYPE (Lookup)                                    │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ _id (PK)                    │ ObjectId │ Primary Key                                            │
│ name                        │ String   │ Unique identifier (e.g., "Manual")                     │
│ displayName                 │ String   │ User-friendly name (e.g., "Manual")                    │
│ description                 │ String   │ Optional description                                   │
│ icon                        │ String   │ Icon identifier                                        │
│ abbreviation                │ String   │ MT, AT, AMT, etc.                                      │
│ isActive                    │ Boolean  │ Whether transmission type is active                    │
│ sortOrder                   │ Number   │ Order in dropdowns                                     │
│ isDeleted                   │ Boolean  │ Soft delete flag                                       │
│ deletedAt                   │ Date     │ Soft delete timestamp                                  │
│ createdAt                   │ Date     │ Creation timestamp                                     │
│ updatedAt                   │ Date     │ Last update timestamp                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

## Relationship Cardinalities

1. **Manufacturer** (1) ──── (N) **Vehicle Model**
   - One manufacturer can have many vehicle models
   - Each vehicle model belongs to exactly one manufacturer

2. **Vehicle Model** (1) ──── (N) **Vehicle Variant**
   - One vehicle model can have many variants
   - Each variant belongs to exactly one vehicle model

3. **Fuel Type** (1) ──── (N) **Vehicle Variant**
   - One fuel type can be used by many variants
   - Each variant has exactly one fuel type

4. **Transmission Type** (1) ──── (N) **Vehicle Variant**
   - One transmission type can be used by many variants
   - Each variant has exactly one transmission type

## Key Constraints

### Unique Constraints
- `Manufacturer.name` - Unique manufacturer identifier
- `VehicleModel.manufacturer + VehicleModel.name` - Unique model per manufacturer
- `VehicleVariant.vehicleModel + VehicleVariant.fuelType + VehicleVariant.transmissionType + VehicleVariant.featurePackage` - Unique variant combination
- `FuelType.name` - Unique fuel type identifier
- `TransmissionType.name` - Unique transmission type identifier

### Indexes for Performance
- `Manufacturer.name` - Fast manufacturer lookup
- `VehicleModel.manufacturer` - Fast model filtering by manufacturer
- `VehicleVariant.vehicleModel` - Fast variant filtering by model
- `VehicleVariant.fuelType` - Fast variant filtering by fuel type
- `VehicleVariant.price` - Fast price-based queries
- `VehicleVariant.fuelType + VehicleVariant.price` - Fast fuel type + price queries
- `VehicleVariant.vehicleModel + VehicleVariant.fuelType` - Fast model + fuel type queries

## Sample Data Flow

```

Manufacturer: Maruti Suzuki
↓
Vehicle Model: Swift
↓
Vehicle Variants:
├─ Swift LXi Petrol Manual
├─ Swift VXi Petrol Manual
├─ Swift ZXi Petrol Manual
├─ Swift LXi Petrol AMT
├─ Swift VXi Petrol AMT
├─ Swift ZXi Petrol AMT
├─ Swift LXi CNG Manual
└─ Swift VXi CNG Manual

````

## Query Examples

### 1. Find all diesel variants of Creta
```javascript
// Find model first
const creta = await VehicleModel.findOne({ name: 'creta' });
// Find diesel fuel type
const diesel = await FuelType.findOne({ name: 'Diesel' });
// Find variants
const variants = await VehicleVariant.find({
  vehicleModel: creta._id,
  fuelType: diesel._id
});
````

### 2. Find CNG variants under ₹8 Lakh

```javascript
const cng = await FuelType.findOne({ name: 'CNG' });
const variants = await VehicleVariant.find({
  fuelType: cng._id,
  price: { $lte: 800000 },
});
```

### 3. Find models with both Petrol and CNG variants

```javascript
const petrol = await FuelType.findOne({ name: 'Petrol' });
const cng = await FuelType.findOne({ name: 'CNG' });

const petrolModels = await VehicleVariant.distinct('vehicleModel', {
  fuelType: petrol._id,
});
const cngModels = await VehicleVariant.distinct('vehicleModel', {
  fuelType: cng._id,
});

const commonModels = petrolModels.filter((id) => cngModels.includes(id));
```
