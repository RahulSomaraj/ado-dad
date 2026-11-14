# Ads Module - Complete API Documentation

## Overview

The Ads Module is a comprehensive system for managing advertisements across multiple categories (Property, Private Vehicle, Commercial Vehicle, Two Wheeler). It provides advanced filtering, search capabilities, and category-specific data management.

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Data Transfer Objects (DTOs)](#data-transfer-objects-dtos)
3. [Database Schemas](#database-schemas)
4. [Service Methods](#service-methods)
5. [Test Cases](#test-cases)
6. [Error Handling](#error-handling)
7. [Performance Considerations](#performance-considerations)

---

## API Endpoints

### 1. Get All Advertisements

**POST** `/ads/list`

**Description**: Retrieve advertisements with comprehensive filtering capabilities.

**Request Body**: `FilterAdDto`

```typescript
{
  // Basic filters
  category?: 'property' | 'private_vehicle' | 'commercial_vehicle' | 'two_wheeler';
  search?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  postedBy?: string;
  isActive?: boolean;
  isPremiumManufacturer?: boolean;

  // Pagination
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'postedAt' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';

  // Property filters
  propertyType?: 'apartment' | 'house' | 'villa' | 'plot' | 'commercial';
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  isFurnished?: boolean;
  hasParking?: boolean;
  hasGarden?: boolean;

  // Vehicle filters
  vehicleType?: 'two_wheeler' | 'four_wheeler';
  manufacturerId?: string | string[];
  modelId?: string | string[];
  variantId?: string | string[];
  minYear?: number;
  maxYear?: number;
  maxMileage?: number;
  transmissionTypeId?: string | string[];
  fuelTypeId?: string | string[];
  color?: string;
  isFirstOwner?: boolean;
  hasInsurance?: boolean;
  hasRcBook?: boolean;

  // Commercial vehicle filters
  commercialVehicleType?: 'truck' | 'bus' | 'van' | 'tractor' | 'trailer';
  bodyType?: 'flatbed' | 'refrigerated' | 'tanker' | 'container' | 'dump';
  minPayloadCapacity?: number;
  maxPayloadCapacity?: number;
  minAxleCount?: number;
  maxAxleCount?: number;
  hasFitness?: boolean;
  hasPermit?: boolean;
  minSeatingCapacity?: number;
  maxSeatingCapacity?: number;
}
```

**Response**: `PaginatedDetailedAdResponseDto`

```typescript
{
  data: DetailedAdResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

**Example Request**:

```json
{
  "category": "property",
  "minPrice": 100000,
  "maxPrice": 5000000,
  "location": "Mumbai",
  "page": 1,
  "limit": 20
}
```

### 2. Get Advertisement by ID

**GET** `/ads/:id`

**Description**: Retrieve a single advertisement with complete details and all relations.

**Parameters**:

- `id` (string): Advertisement ID (MongoDB ObjectId)

**Response**: `DetailedAdResponseDto`

**Example Response**:

```json
{
  "id": "507f1f77bcf86cd799439011",
  "description": "Beautiful 2BHK Apartment in Prime Location",
  "price": 8500000,
  "images": ["https://example.com/image1.jpg"],
  "location": "Bandra West, Mumbai, Maharashtra",
  "category": "property",
  "isActive": true,
  "postedAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "postedBy": "507f1f77bcf86cd799439021",
  "user": {
    "id": "507f1f77bcf86cd799439021",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+91-9876543210"
  },
  "propertyDetails": {
    "propertyType": "apartment",
    "bedrooms": 2,
    "bathrooms": 2,
    "areaSqft": 1200,
    "floor": 8,
    "isFurnished": true,
    "hasParking": true,
    "hasGarden": false,
    "amenities": ["Gym", "Swimming Pool", "Security"]
  },
  "favoritesCount": 5,
  "isFavorited": false,
  "averageRating": 4.5,
  "ratingsCount": 12
}
```

### 3. Create Advertisement

**POST** `/ads`

**Description**: Create an advertisement for any category.

**Authentication**: Required (JWT Bearer Token)

**Request Body**: `CreateAdDto`

```typescript
{
  category: 'property' | 'private_vehicle' | 'commercial_vehicle' | 'two_wheeler';
  data: {
    // Common fields
    description: string;
    price: number;
    location: string;
    images?: string[];

    // Category-specific fields (based on category)
    // Property fields
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    areaSqft?: number;
    floor?: number;
    isFurnished?: boolean;
    hasParking?: boolean;
    hasGarden?: boolean;
    amenities?: string[];

    // Vehicle fields
    vehicleType?: string;
    manufacturerId?: string;
    modelId?: string;
    variantId?: string;
    year?: number;
    mileage?: number;
    transmissionTypeId?: string;
    fuelTypeId?: string;
    color?: string;
    isFirstOwner?: boolean;
    hasInsurance?: boolean;
    hasRcBook?: boolean;
    additionalFeatures?: string[];

    // Commercial vehicle fields
    commercialVehicleType?: string;
    bodyType?: string;
    payloadCapacity?: number;
    payloadUnit?: string;
    axleCount?: number;
    hasFitness?: boolean;
    hasPermit?: boolean;
    seatingCapacity?: number;
  };
}
```

**Response**: `AdResponseDto`

### 4. Update Advertisement

**PUT** `/ads/:id` or **PUT** `/ads/v2/:id`

**Description**: Update an existing advertisement.

**Authentication**: Required (JWT Bearer Token)

**Request Body**: `EditAdDto` (all fields optional)

**Response**: `AdResponseDto`

### 5. Delete Advertisement

**DELETE** `/ads/:id`

**Description**: Delete an advertisement.

**Authentication**: Required (JWT Bearer Token)

**Response**: `{ message: string }`

### 6. Get User's Advertisements

**POST** `/ads/my-ads`

**Description**: Get all advertisements posted by the current user.

**Authentication**: Required (JWT Bearer Token)

**Request Body**:

```typescript
{
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
```

**Response**: `PaginatedDetailedAdResponseDto`

### 7. Upload Images

**POST** `/ads/upload-images`

**Description**: Upload multiple images for advertisements.

**Authentication**: Required (JWT Bearer Token)

**Request**: Multipart form data with `files` field

**Response**: `{ urls: string[] }`

### 8. Vehicle Inventory Lookup Endpoints

#### Get Manufacturers

**GET** `/ads/lookup/manufacturers`

#### Get Manufacturer by ID

**GET** `/ads/lookup/manufacturers/:id`

#### Get Vehicle Models

**POST** `/ads/lookup/vehicle-models`

**Request Body**: `FilterVehicleModelsDto`

```typescript
{
  manufacturerId?: string;
}
```

#### Get Vehicle Variants

**POST** `/ads/lookup/vehicle-variants`

**Request Body**: `FilterVehicleVariantsDto`

```typescript
{
  modelId?: string;
  fuelTypeId?: string;
  transmissionTypeId?: string;
  maxPrice?: number;
}
```

### 9. Cache Management

**POST** `/ads/cache/warm-up`

**Description**: Warm up cache with popular queries.

**Authentication**: Required (Super Admin only)

### 10. Data Validation Endpoints

#### Check Data Consistency

**GET** `/ads/validation/consistency`

#### Generate Consistency Report

**GET** `/ads/validation/report`

#### Cleanup Orphaned Ads

**POST** `/ads/validation/cleanup`

---

## Data Transfer Objects (DTOs)

### FilterAdDto

Complete filtering options for advertisement queries.

### CreateAdDto

```typescript
{
  category: AdCategory;
  data: CreateAdDataDto;
}
```

### EditAdDto

```typescript
{
  category?: AdCategory;
  data?: EditAdDataDto;
}
```

### AdResponseDto

Basic advertisement response with core fields.

### DetailedAdResponseDto

Extended response with category-specific details, user info, and statistics.

### PaginatedDetailedAdResponseDto

Paginated response containing array of detailed advertisements.

---

## Database Schemas

### Ad Schema

```typescript
{
  _id: ObjectId;
  title?: string;
  description: string;
  price: number;
  images: string[];
  location: string;
  postedBy: ObjectId;
  category: 'property' | 'private_vehicle' | 'commercial_vehicle' | 'two_wheeler';
  isActive: boolean;
  status?: string;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### PropertyAd Schema

```typescript
{
  _id: ObjectId;
  ad: ObjectId;
  adId: ObjectId;
  propertyType: 'apartment' | 'house' | 'villa' | 'plot' | 'commercial';
  bedrooms: number;
  bathrooms: number;
  areaSqft: number;
  floor?: number;
  isFurnished?: boolean;
  hasParking?: boolean;
  hasGarden?: boolean;
  amenities: string[];
}
```

### VehicleAd Schema

```typescript
{
  _id: ObjectId;
  ad: ObjectId;
  adId: ObjectId;
  vehicleType: 'two_wheeler' | 'four_wheeler';
  manufacturerId: ObjectId;
  modelId: ObjectId;
  variantId?: ObjectId;
  year: number;
  mileage: number;
  transmissionTypeId: ObjectId;
  fuelTypeId: ObjectId;
  color: string;
  isFirstOwner?: boolean;
  hasInsurance?: boolean;
  hasRcBook?: boolean;
  additionalFeatures: string[];
}
```

### CommercialVehicleAd Schema

```typescript
{
  _id: ObjectId;
  ad: ObjectId;
  adId: ObjectId;
  commercialVehicleType: 'truck' | 'bus' | 'van' | 'tractor' | 'trailer';
  bodyType: 'flatbed' | 'refrigerated' | 'tanker' | 'container' | 'dump';
  manufacturerId: ObjectId;
  modelId: ObjectId;
  variantId?: ObjectId;
  year: number;
  mileage: number;
  payloadCapacity: number;
  payloadUnit: string;
  axleCount: number;
  transmissionTypeId: ObjectId;
  fuelTypeId: ObjectId;
  color: string;
  hasInsurance?: boolean;
  hasFitness?: boolean;
  hasPermit?: boolean;
  additionalFeatures: string[];
  seatingCapacity?: number;
}
```

---

## Service Methods

### AdsService

#### Core Methods

- `findAll(filters: FilterAdDto): Promise<PaginatedDetailedAdResponseDto>`
- `getAdById(id: string, userId?: string): Promise<DetailedAdResponseDto>`
- `createAd(dto: CreateAdDto, userId: string): Promise<AdResponseDto>`
- `update(id: string, dto: any, userId: string, userType?: string): Promise<AdResponseDto>`
- `delete(id: string, userId: string, userType?: string): Promise<void>`

#### User Methods

- `getUserAds(userId: string, filters: any): Promise<PaginatedDetailedAdResponseDto>`

#### Utility Methods

- `findByIds(ids: string[]): Promise<AdResponseDto[]>`
- `warmUpCache(): Promise<void>`

#### Private Helper Methods

- `isValidId(id?: string): boolean`
- `toObjectId(id?: string): ObjectId | undefined`
- `normalize(obj: any): any`
- `clamp(n: number, min: number, max: number): number`
- `coerceSort(sortBy?: string, sortOrder?: string): { field: string; dir: 1 | -1 }`
- `mapToResponseDto(ad: any): AdResponseDto`
- `mapToDetailedResponseDto(ad: any): DetailedAdResponseDto`

---

## Test Cases

### 1. Get All Advertisements Tests

#### Test Case 1.1: Basic Filtering

```typescript
describe('GET /ads/list - Basic Filtering', () => {
  it('should return all ads when no filters applied', async () => {
    const response = await request(app.getHttpServer())
      .post('/ads/list')
      .send({})
      .expect(200);

    expect(response.body.data).toBeDefined();
    expect(response.body.total).toBeGreaterThanOrEqual(0);
    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(20);
  });

  it('should filter by category', async () => {
    const response = await request(app.getHttpServer())
      .post('/ads/list')
      .send({ category: 'property' })
      .expect(200);

    response.body.data.forEach((ad) => {
      expect(ad.category).toBe('property');
    });
  });

  it('should filter by price range', async () => {
    const response = await request(app.getHttpServer())
      .post('/ads/list')
      .send({
        minPrice: 100000,
        maxPrice: 1000000,
      })
      .expect(200);

    response.body.data.forEach((ad) => {
      expect(ad.price).toBeGreaterThanOrEqual(100000);
      expect(ad.price).toBeLessThanOrEqual(1000000);
    });
  });
});
```

#### Test Case 1.2: Property Filtering

```typescript
describe('GET /ads/list - Property Filtering', () => {
  it('should filter by property type', async () => {
    const response = await request(app.getHttpServer())
      .post('/ads/list')
      .send({
        category: 'property',
        propertyType: 'apartment',
      })
      .expect(200);

    response.body.data.forEach((ad) => {
      expect(ad.category).toBe('property');
      expect(ad.propertyDetails.propertyType).toBe('apartment');
    });
  });

  it('should filter by bedrooms and bathrooms', async () => {
    const response = await request(app.getHttpServer())
      .post('/ads/list')
      .send({
        category: 'property',
        minBedrooms: 2,
        maxBedrooms: 3,
        minBathrooms: 2,
      })
      .expect(200);

    response.body.data.forEach((ad) => {
      expect(ad.propertyDetails.bedrooms).toBeGreaterThanOrEqual(2);
      expect(ad.propertyDetails.bedrooms).toBeLessThanOrEqual(3);
      expect(ad.propertyDetails.bathrooms).toBeGreaterThanOrEqual(2);
    });
  });
});
```

#### Test Case 1.3: Vehicle Filtering

```typescript
describe('GET /ads/list - Vehicle Filtering', () => {
  it('should filter by manufacturer and model', async () => {
    const response = await request(app.getHttpServer())
      .post('/ads/list')
      .send({
        category: 'private_vehicle',
        manufacturerId: '507f1f77bcf86cd799439011',
        modelId: '507f1f77bcf86cd799439012',
      })
      .expect(200);

    response.body.data.forEach((ad) => {
      expect(ad.category).toBe('private_vehicle');
      expect(ad.vehicleDetails.manufacturerId).toBe('507f1f77bcf86cd799439011');
      expect(ad.vehicleDetails.modelId).toBe('507f1f77bcf86cd799439012');
    });
  });

  it('should filter by year range and mileage', async () => {
    const response = await request(app.getHttpServer())
      .post('/ads/list')
      .send({
        category: 'private_vehicle',
        minYear: 2018,
        maxYear: 2023,
        maxMileage: 50000,
      })
      .expect(200);

    response.body.data.forEach((ad) => {
      expect(ad.vehicleDetails.year).toBeGreaterThanOrEqual(2018);
      expect(ad.vehicleDetails.year).toBeLessThanOrEqual(2023);
      expect(ad.vehicleDetails.mileage).toBeLessThanOrEqual(50000);
    });
  });
});
```

### 2. Create Advertisement Tests

#### Test Case 2.1: Property Advertisement

```typescript
describe('POST /ads - Property Advertisement', () => {
  it('should create property advertisement with valid data', async () => {
    const propertyAd = {
      category: 'property',
      data: {
        description: 'Beautiful 2BHK Apartment',
        price: 8500000,
        location: 'Mumbai, Maharashtra',
        images: ['https://example.com/image1.jpg'],
        propertyType: 'apartment',
        bedrooms: 2,
        bathrooms: 2,
        areaSqft: 1200,
        floor: 8,
        isFurnished: true,
        hasParking: true,
        hasGarden: false,
        amenities: ['Gym', 'Swimming Pool'],
      },
    };

    const response = await request(app.getHttpServer())
      .post('/ads')
      .set('Authorization', `Bearer ${authToken}`)
      .send(propertyAd)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.category).toBe('property');
    expect(response.body.description).toBe('Beautiful 2BHK Apartment');
    expect(response.body.price).toBe(8500000);
  });

  it('should fail with missing required fields', async () => {
    const invalidAd = {
      category: 'property',
      data: {
        description: 'Beautiful 2BHK Apartment',
        price: 8500000,
        // Missing location
        propertyType: 'apartment',
        bedrooms: 2,
        bathrooms: 2,
        areaSqft: 1200,
      },
    };

    await request(app.getHttpServer())
      .post('/ads')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidAd)
      .expect(400);
  });
});
```

#### Test Case 2.2: Vehicle Advertisement

```typescript
describe('POST /ads - Vehicle Advertisement', () => {
  it('should create vehicle advertisement with valid data', async () => {
    const vehicleAd = {
      category: 'private_vehicle',
      data: {
        description: 'Honda City 2020 Model',
        price: 850000,
        location: 'Delhi, NCR',
        images: ['https://example.com/vehicle1.jpg'],
        vehicleType: 'four_wheeler',
        manufacturerId: '507f1f77bcf86cd799439031',
        modelId: '507f1f77bcf86cd799439041',
        variantId: '507f1f77bcf86cd799439051',
        year: 2020,
        mileage: 25000,
        transmissionTypeId: '507f1f77bcf86cd799439061',
        fuelTypeId: '507f1f77bcf86cd799439071',
        color: 'White',
        isFirstOwner: true,
        hasInsurance: true,
        hasRcBook: true,
        additionalFeatures: ['Sunroof', 'Leather Seats'],
      },
    };

    const response = await request(app.getHttpServer())
      .post('/ads')
      .set('Authorization', `Bearer ${authToken}`)
      .send(vehicleAd)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.category).toBe('private_vehicle');
    expect(response.body.vehicleDetails).toBeDefined();
    expect(response.body.vehicleDetails.manufacturerId).toBe(
      '507f1f77bcf86cd799439031',
    );
  });
});
```

### 3. Update Advertisement Tests

#### Test Case 3.1: Update Property Advertisement

```typescript
describe('PUT /ads/:id - Update Property Advertisement', () => {
  it('should update property advertisement fields', async () => {
    const updateData = {
      data: {
        description: 'Updated description',
        price: 9000000,
        bedrooms: 3,
        bathrooms: 3,
        areaSqft: 1500,
      },
    };

    const response = await request(app.getHttpServer())
      .put(`/ads/${adId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.description).toBe('Updated description');
    expect(response.body.price).toBe(9000000);
  });

  it('should fail to update with invalid user', async () => {
    const updateData = {
      data: {
        description: 'Updated description',
      },
    };

    await request(app.getHttpServer())
      .put(`/ads/${adId}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send(updateData)
      .expect(403);
  });
});
```

### 4. Delete Advertisement Tests

#### Test Case 4.1: Delete Advertisement

```typescript
describe('DELETE /ads/:id - Delete Advertisement', () => {
  it('should delete advertisement by owner', async () => {
    await request(app.getHttpServer())
      .delete(`/ads/${adId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Verify ad is deleted
    await request(app.getHttpServer()).get(`/ads/${adId}`).expect(404);
  });

  it('should delete advertisement by admin', async () => {
    await request(app.getHttpServer())
      .delete(`/ads/${adId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('should fail to delete with invalid user', async () => {
    await request(app.getHttpServer())
      .delete(`/ads/${adId}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .expect(403);
  });
});
```

### 5. Get User Advertisements Tests

#### Test Case 5.1: Get My Ads

```typescript
describe('POST /ads/my-ads - Get User Advertisements', () => {
  it('should return user advertisements', async () => {
    const response = await request(app.getHttpServer())
      .post('/ads/my-ads')
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(200);

    expect(response.body.data).toBeDefined();
    response.body.data.forEach((ad) => {
      expect(ad.postedBy).toBe(userId);
    });
  });

  it('should filter user advertisements by category', async () => {
    const response = await request(app.getHttpServer())
      .post('/ads/my-ads')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ category: 'property' })
      .expect(200);

    response.body.data.forEach((ad) => {
      expect(ad.category).toBe('property');
    });
  });
});
```

### 6. Search Functionality Tests

#### Test Case 6.1: Text Search

```typescript
describe('Search Functionality', () => {
  it('should search by description', async () => {
    const response = await request(app.getHttpServer())
      .post('/ads/list')
      .send({ search: 'apartment' })
      .expect(200);

    response.body.data.forEach((ad) => {
      expect(
        ad.description.toLowerCase().includes('apartment') ||
          ad.location.toLowerCase().includes('apartment'),
      ).toBe(true);
    });
  });

  it('should search by manufacturer name', async () => {
    const response = await request(app.getHttpServer())
      .post('/ads/list')
      .send({
        category: 'private_vehicle',
        search: 'honda',
      })
      .expect(200);

    response.body.data.forEach((ad) => {
      expect(ad.category).toBe('private_vehicle');
      // Should match manufacturer name in vehicle details
    });
  });
});
```

### 7. Pagination Tests

#### Test Case 7.1: Pagination

```typescript
describe('Pagination', () => {
  it('should handle pagination correctly', async () => {
    const response = await request(app.getHttpServer())
      .post('/ads/list')
      .send({
        page: 2,
        limit: 5,
      })
      .expect(200);

    expect(response.body.page).toBe(2);
    expect(response.body.limit).toBe(5);
    expect(response.body.data.length).toBeLessThanOrEqual(5);
    expect(response.body.totalPages).toBeGreaterThanOrEqual(2);
  });

  it('should return empty data for invalid page', async () => {
    const response = await request(app.getHttpServer())
      .post('/ads/list')
      .send({
        page: 999,
        limit: 10,
      })
      .expect(200);

    expect(response.body.data).toHaveLength(0);
    expect(response.body.page).toBe(999);
  });
});
```

### 8. Error Handling Tests

#### Test Case 8.1: Invalid Data

```typescript
describe('Error Handling', () => {
  it('should return 400 for invalid ObjectId', async () => {
    await request(app.getHttpServer()).get('/ads/invalid-id').expect(400);
  });

  it('should return 404 for non-existent ad', async () => {
    await request(app.getHttpServer())
      .get('/ads/507f1f77bcf86cd799439999')
      .expect(404);
  });

  it('should return 401 for unauthorized access', async () => {
    await request(app.getHttpServer())
      .post('/ads')
      .send(validAdData)
      .expect(401);
  });
});
```

---

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Error Response Format

```typescript
{
  statusCode: number;
  message: string | string[];
  error: string;
}
```

### Common Error Scenarios

1. **Invalid ObjectId**: Returns 400 with message about ObjectId format
2. **Missing Required Fields**: Returns 400 with validation errors
3. **Unauthorized Access**: Returns 401 for missing authentication
4. **Forbidden Access**: Returns 403 for insufficient permissions
5. **Not Found**: Returns 404 for non-existent resources

---

## Performance Considerations

### Caching Strategy

- **List Queries**: 120 seconds TTL
- **Individual Ads**: 900 seconds TTL
- **Cache Invalidation**: On create, update, delete operations

### Database Indexes

- `{ isDeleted: 1, category: 1, status: 1, createdAt: -1 }`
- `{ postedBy: 1, isDeleted: 1, status: 1, createdAt: -1 }`
- `{ 'vehicleDetails.manufacturerId': 1, 'vehicleDetails.modelId': 1 }`
- `{ 'propertyDetails.propertyType': 1, 'propertyDetails.bedrooms': 1 }`

### Query Optimization

- Uses MongoDB aggregation pipelines
- Implements robust lookups for category-specific data
- Supports case-insensitive text search
- Implements pagination at database level

### Rate Limiting

- Image upload: 10 files per request
- Bulk operations: Maximum 50 items
- Cache warm-up: Super admin only

---

## Security Considerations

### Authentication

- JWT Bearer token required for write operations
- Role-based access control (USER, ADMIN, SUPER_ADMIN)

### Authorization

- Users can only update/delete their own ads
- Admins can manage all ads
- Super admins have full access

### Input Validation

- Comprehensive DTO validation using class-validator
- ObjectId format validation
- File type and size validation for uploads

### Data Sanitization

- Input normalization and sanitization
- SQL injection prevention through parameterized queries
- XSS prevention through proper output encoding

---

This documentation provides a complete reference for the Ads Module, including all APIs, data structures, test cases, and implementation details. It can be used as a prompt for future development or refactoring work.
