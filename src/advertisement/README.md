# Advertisement Module Documentation

## Overview

The Advertisement module provides a comprehensive system for managing vehicle and property advertisements with embedded documents, advanced filtering, and full CRUD operations.

## API Endpoints

| Method | Endpoint   | Description                         | Auth Required |
| ------ | ---------- | ----------------------------------- | ------------- |
| POST   | `/ads`     | Create a new advertisement          | Yes           |
| GET    | `/ads`     | Get all advertisements with filters | Yes           |
| GET    | `/ads/:id` | Get advertisement by ID             | Yes           |
| PATCH  | `/ads/:id` | Update advertisement (owner only)   | Yes           |
| DELETE | `/ads/:id` | Delete advertisement (owner only)   | Yes           |

## Data Structure

### Common Advertisement Fields

| Field         | Type     | Required | Description                      |
| ------------- | -------- | -------- | -------------------------------- |
| `type`        | enum     | Yes      | 'Vehicle' or 'Property'          |
| `adTitle`     | string   | Yes      | Advertisement title              |
| `description` | string   | Yes      | Detailed description             |
| `name`        | string   | No       | Contact name                     |
| `phoneNumber` | string   | No       | Contact phone                    |
| `price`       | number   | Yes      | Price in rupees                  |
| `imageUrls`   | string[] | Yes      | Array of image URLs              |
| `state`       | string   | Yes      | State location                   |
| `city`        | string   | Yes      | City location                    |
| `district`    | string   | Yes      | District location                |
| `isApproved`  | boolean  | No       | Approval status (default: false) |
| `category`    | ObjectId | Yes      | Category reference               |
| `createdBy`   | ObjectId | Yes      | User who created the ad          |
| `approvedBy`  | ObjectId | No       | User who approved the ad         |
| `createdAt`   | Date     | Auto     | Creation timestamp               |
| `updatedAt`   | Date     | Auto     | Last update timestamp            |

### Vehicle-Specific Fields (Embedded)

| Field                                   | Type     | Required | Description                                     |
| --------------------------------------- | -------- | -------- | ----------------------------------------------- |
| `vehicle.name`                          | string   | Yes      | Vehicle brand name                              |
| `vehicle.modelName`                     | string   | Yes      | Vehicle model name                              |
| `vehicle.color`                         | string   | Yes      | Vehicle color                                   |
| `vehicle.details.modelYear`             | number   | Yes      | Manufacturing year                              |
| `vehicle.details.month`                 | string   | Yes      | Manufacturing month                             |
| `vehicle.vendor`                        | ObjectId | Yes      | Vehicle company reference                       |
| `vehicle.vehicleModel.name`             | string   | Yes      | Model variant name                              |
| `vehicle.vehicleModel.modelName`        | string   | Yes      | Model variant code                              |
| `vehicle.vehicleModel.modelDetails`     | string   | No       | Additional model details                        |
| `vehicle.vehicleModel.fuelType`         | enum     | Yes      | Petrol/Diesel/Electric/Hybrid/CNG               |
| `vehicle.vehicleModel.transmissionType` | enum     | Yes      | Manual/Automatic/Semi-Automatic/CVT/Dual-Clutch |
| `vehicle.vehicleModel.mileage`          | number   | Yes      | Fuel efficiency (km/l)                          |
| `vehicle.vehicleModel.engineCapacity`   | number   | Yes      | Engine capacity (cc)                            |
| `vehicle.vehicleModel.fuelCapacity`     | number   | Yes      | Fuel tank capacity (L)                          |
| `vehicle.vehicleModel.maxPower`         | number   | Yes      | Maximum power (bhp)                             |
| `vehicle.vehicleModel.additionalInfo.*` | mixed    | No       | Various additional features                     |

### Property-Specific Fields (Embedded)

| Field                      | Type     | Required    | Description                                                       |
| -------------------------- | -------- | ----------- | ----------------------------------------------------------------- |
| `property.type`            | enum     | Yes         | house/apartment/shopAndOffice/pgAndGuestHouse/land                |
| `property.category`        | enum     | Yes         | forSale/forRent/landsAndPlots                                     |
| `property.bhk`             | number   | Conditional | Number of bedrooms                                                |
| `property.bathrooms`       | number   | Conditional | Number of bathrooms                                               |
| `property.furnished`       | enum     | Conditional | Furnished/Semi-Furnished/Unfurnished                              |
| `property.projectStatus`   | enum     | Conditional | Under Construction/Ready to Move/Resale                           |
| `property.maintenanceCost` | number   | No          | Monthly maintenance cost                                          |
| `property.carpetArea`      | number   | No          | Carpet area in sq ft                                              |
| `property.buildArea`       | number   | No          | Built-up area in sq ft                                            |
| `property.floorArea`       | number   | No          | Floor area in sq ft                                               |
| `property.projectName`     | string   | No          | Project/building name                                             |
| `property.totalFloors`     | number   | Conditional | Total floors in building                                          |
| `property.floorNo`         | number   | Conditional | Floor number                                                      |
| `property.carParking`      | number   | No          | Number of car parking spaces                                      |
| `property.owner`           | ObjectId | Yes         | Property owner reference                                          |
| `property.facing`          | enum     | No          | North/South/East/West/North-East/North-West/South-East/South-West |
| `property.listedBy`        | enum     | Yes         | Owner/Dealer/Builder                                              |

## Supported Filters

### Basic Filters

| Filter        | Type    | Description                 | Example                    |
| ------------- | ------- | --------------------------- | -------------------------- |
| `type`        | enum    | Advertisement type          | 'Vehicle' or 'Property'    |
| `category`    | string  | Category ID                 | '609c1d1f4f1a2561d8e6b789' |
| `subCategory` | string  | Subcategory name            | 'Sedan'                    |
| `priceMin`    | number  | Minimum price               | 100000                     |
| `priceMax`    | number  | Maximum price               | 5000000                    |
| `state`       | string  | State location              | 'Maharashtra'              |
| `city`        | string  | City location               | 'Mumbai'                   |
| `district`    | string  | District location           | 'Mumbai Suburban'          |
| `search`      | string  | Search in title/description | '3BHK apartment'           |
| `isApproved`  | boolean | Approval status             | true                       |

### Vehicle-Specific Filters

| Filter             | Type   | Description        | Example                                                       |
| ------------------ | ------ | ------------------ | ------------------------------------------------------------- |
| `fuelType`         | enum   | Fuel type          | 'Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'               |
| `transmissionType` | enum   | Transmission type  | 'Manual', 'Automatic', 'Semi-Automatic', 'CVT', 'Dual-Clutch' |
| `vehicleBrand`     | string | Vehicle brand      | 'Toyota'                                                      |
| `vehicleModel`     | string | Vehicle model      | 'Camry'                                                       |
| `modelYearMin`     | number | Minimum model year | 2020                                                          |
| `modelYearMax`     | number | Maximum model year | 2023                                                          |
| `vehicleColor`     | string | Vehicle color      | 'Red'                                                         |
| `mileageMin`       | number | Minimum mileage    | 10                                                            |
| `mileageMax`       | number | Maximum mileage    | 25                                                            |

### Property-Specific Filters

| Filter             | Type   | Description          | Example                                                          |
| ------------------ | ------ | -------------------- | ---------------------------------------------------------------- |
| `propertyType`     | enum   | Property type        | 'house', 'apartment', 'shopAndOffice', 'pgAndGuestHouse', 'land' |
| `propertyCategory` | enum   | Property category    | 'forSale', 'forRent', 'landsAndPlots'                            |
| `bedroomsMin`      | number | Minimum bedrooms     | 2                                                                |
| `bedroomsMax`      | number | Maximum bedrooms     | 4                                                                |
| `bathroomsMin`     | number | Minimum bathrooms    | 1                                                                |
| `bathroomsMax`     | number | Maximum bathrooms    | 3                                                                |
| `furnished`        | enum   | Furnished type       | 'Furnished', 'Semi-Furnished', 'Unfurnished'                     |
| `projectStatus`    | enum   | Project status       | 'Under Construction', 'Ready to Move', 'Resale'                  |
| `carpetAreaMin`    | number | Minimum carpet area  | 1000                                                             |
| `carpetAreaMax`    | number | Maximum carpet area  | 2000                                                             |
| `buildAreaMin`     | number | Minimum build area   | 1200                                                             |
| `buildAreaMax`     | number | Maximum build area   | 2500                                                             |
| `floorNoMin`       | number | Minimum floor number | 1                                                                |
| `floorNoMax`       | number | Maximum floor number | 10                                                               |
| `carParkingMin`    | number | Minimum car parking  | 1                                                                |
| `carParkingMax`    | number | Maximum car parking  | 3                                                                |
| `facing`           | string | Property facing      | 'North'                                                          |
| `listedBy`         | string | Listed by            | 'Owner', 'Dealer', 'Builder'                                     |

### Pagination & Sorting

| Filter      | Type   | Description                            | Example              |
| ----------- | ------ | -------------------------------------- | -------------------- |
| `page`      | number | Page number (default: 1)               | 1                    |
| `limit`     | number | Items per page (max: 100, default: 10) | 20                   |
| `sortBy`    | string | Sort field                             | 'price', 'createdAt' |
| `sortOrder` | enum   | Sort order                             | 'asc', 'desc'        |

## Validation Rules

### Create Advertisement

- `type` must be either 'Vehicle' or 'Property'
- `adTitle`, `description`, `price`, `imageUrls`, `state`, `city`, `district`, `category` are required
- `price` must be >= 0
- `imageUrls` must be non-empty array
- For Vehicle type: `vehicle` object is required, `property` must not be provided
- For Property type: `property` object is required, `vehicle` must not be provided

### Update Advertisement

- Only the advertisement owner can update
- All fields are optional
- Embedded documents (`vehicle`, `property`) are merged with existing data
- Category validation if provided

### Filter Validation

- All filter fields are optional
- Numeric ranges must have valid min/max values
- Enum values must match defined options
- Search is case-insensitive
- Pagination limits are enforced

## Best Practices Implemented

1. **Embedded Documents**: Vehicle and Property details are embedded as subdocuments to preserve structure and avoid dot notation in projections
2. **Indexing**: Database indexes on frequently queried fields for performance
3. **Validation**: Comprehensive validation using class-validator decorators
4. **Error Handling**: Proper HTTP status codes and error messages
5. **Authorization**: Role-based access control and owner-only operations
6. **Swagger Documentation**: Complete API documentation with examples
7. **Pagination**: Efficient pagination with total count and page information
8. **Flexible Filtering**: Dynamic query building based on provided filters
9. **Type Safety**: Full TypeScript support with proper types and interfaces

## Example Usage

### Create Vehicle Advertisement

```json
{
  "type": "Vehicle",
  "adTitle": "2019 Toyota Camry for Sale",
  "description": "Well maintained Toyota Camry with low mileage",
  "price": 1500000,
  "imageUrls": ["https://example.com/car1.jpg"],
  "state": "Maharashtra",
  "city": "Mumbai",
  "district": "Mumbai Suburban",
  "category": "609c1d1f4f1a2561d8e6b789",
  "vehicle": {
    "name": "Toyota",
    "modelName": "Camry",
    "color": "Silver",
    "details": {
      "modelYear": 2019,
      "month": "March"
    },
    "vendor": "67b349d2c0ec145884f86926",
    "vehicleModel": {
      "name": "Camry XLE",
      "modelName": "XLE",
      "fuelType": "Petrol",
      "transmissionType": "Automatic",
      "mileage": 18,
      "engineCapacity": 2500,
      "fuelCapacity": 60,
      "maxPower": 203
    }
  }
}
```

### Create Property Advertisement

```json
{
  "type": "Property",
  "adTitle": "3BHK Apartment for Sale in Andheri",
  "description": "Beautiful apartment with modern amenities",
  "price": 8500000,
  "imageUrls": ["https://example.com/apartment1.jpg"],
  "state": "Maharashtra",
  "city": "Mumbai",
  "district": "Mumbai Suburban",
  "category": "609c1d1f4f1a2561d8e6b789",
  "property": {
    "type": "apartment",
    "category": "forSale",
    "bhk": 3,
    "bathrooms": 2,
    "furnished": "Semi-Furnished",
    "projectStatus": "Ready to Move",
    "carpetArea": 1200,
    "buildArea": 1400,
    "totalFloors": 15,
    "floorNo": 8,
    "carParking": 1,
    "facing": "North-East",
    "listedBy": "Owner",
    "owner": "67b349d2c0ec145884f86926"
  }
}
```

### Filter Examples

```
GET /ads?type=Vehicle&fuelType=Petrol&priceMin=1000000&priceMax=2000000&page=1&limit=10

GET /ads?type=Property&propertyType=apartment&bedroomsMin=2&bedroomsMax=4&city=Mumbai&sortBy=price&sortOrder=desc
```
