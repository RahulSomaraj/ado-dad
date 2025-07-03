# Vehicle Manufacturer Filter API Examples

## Overview

The `GET /vehicle-inventory/manufacturers` endpoint supports comprehensive filtering with query parameters. This document provides examples of all possible filter combinations.

## Base URL

```
GET http://localhost:5000/vehicle-inventory/manufacturers
```

## Available Query Parameters

| Parameter        | Type    | Description                                  | Example         |
| ---------------- | ------- | -------------------------------------------- | --------------- |
| `search`         | string  | Search by name, display name, or description | `honda`         |
| `originCountry`  | string  | Filter by country of origin                  | `Japan`         |
| `minFoundedYear` | number  | Minimum founded year                         | `1900`          |
| `maxFoundedYear` | number  | Maximum founded year                         | `2000`          |
| `headquarters`   | string  | Filter by headquarters location              | `Tokyo`         |
| `isActive`       | boolean | Filter by active status                      | `true`          |
| `category`       | enum    | Filter by manufacturer category              | `passenger_car` |
| `region`         | enum    | Filter by region                             | `Asia`          |
| `sortBy`         | enum    | Sort field                                   | `name`          |
| `sortOrder`      | enum    | Sort direction                               | `ASC`           |
| `page`           | number  | Page number                                  | `1`             |
| `limit`          | number  | Items per page                               | `20`            |

## Filter Categories

### Manufacturer Categories

- `passenger_car` - Car manufacturers (Maruti Suzuki, Honda, Toyota, etc.)
- `two_wheeler` - Motorcycle/scooter manufacturers (Hero, Bajaj, TVS, etc.)
- `commercial_vehicle` - Truck/bus manufacturers (Ashok Leyland, Eicher, etc.)
- `luxury` - Luxury car manufacturers (BMW, Mercedes, Audi, etc.)
- `suv` - SUV specialists (Mahindra, Jeep, Haval, etc.)

### Regions

- `Asia` - India, Japan, South Korea, China
- `Europe` - Germany, Sweden, Czech Republic
- `North America` - United States
- `South America` - (No manufacturers yet)
- `Africa` - (No manufacturers yet)
- `Oceania` - (No manufacturers yet)

### Sort Fields

- `name` - Manufacturer name
- `displayName` - Display name
- `originCountry` - Country of origin
- `foundedYear` - Year founded
- `headquarters` - Headquarters location
- `createdAt` - Creation date
- `updatedAt` - Last update date

## Example Requests

### 1. Get All Manufacturers (No Filters)

```bash
curl -X GET "http://localhost:5000/vehicle-inventory/manufacturers" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "data": [
    {
      "_id": "686011b01bba6a053e0be845",
      "name": "honda",
      "displayName": "Honda",
      "originCountry": "Japan",
      "description": "Japanese multinational known for automobiles, motorcycles, and power equipment",
      "logo": "https://example.com/logos/honda.png",
      "website": "https://www.honda.com",
      "foundedYear": 1948,
      "headquarters": "Tokyo, Japan",
      "isActive": true
    }
    // ... more manufacturers
  ],
  "total": 32,
  "page": 1,
  "limit": 32,
  "totalPages": 1,
  "hasNext": false,
  "hasPrev": false
}
```

### 2. Search by Text

```bash
curl -X GET "http://localhost:5000/vehicle-inventory/manufacturers?search=honda" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Filter by Country

```bash
curl -X GET "http://localhost:5000/vehicle-inventory/manufacturers?originCountry=Japan" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Filter by Founded Year Range

```bash
curl -X GET "http://localhost:5000/vehicle-inventory/manufacturers?minFoundedYear=1900&maxFoundedYear=1950" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Filter by Category

```bash
curl -X GET "http://localhost:5000/vehicle-inventory/manufacturers?category=passenger_car" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Filter by Region

```bash
curl -X GET "http://localhost:5000/vehicle-inventory/manufacturers?region=Asia" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 7. Filter by Headquarters

```bash
curl -X GET "http://localhost:5000/vehicle-inventory/manufacturers?headquarters=Tokyo" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 8. Combined Filters

```bash
curl -X GET "http://localhost:5000/vehicle-inventory/manufacturers?search=honda&originCountry=Japan&category=passenger_car&minFoundedYear=1900&maxFoundedYear=2000&sortBy=name&sortOrder=ASC&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 9. Pagination Example

```bash
curl -X GET "http://localhost:5000/vehicle-inventory/manufacturers?page=1&limit=5&sortBy=foundedYear&sortOrder=DESC" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 10. Luxury Car Manufacturers

```bash
curl -X GET "http://localhost:5000/vehicle-inventory/manufacturers?category=luxury&region=Europe&sortBy=displayName&sortOrder=ASC" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 11. Two-Wheeler Manufacturers from India

```bash
curl -X GET "http://localhost:5000/vehicle-inventory/manufacturers?category=two_wheeler&originCountry=India&sortBy=displayName&sortOrder=ASC" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 12. Commercial Vehicle Manufacturers

```bash
curl -X GET "http://localhost:5000/vehicle-inventory/manufacturers?category=commercial_vehicle&sortBy=foundedYear&sortOrder=ASC" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 13. SUV Specialists

```bash
curl -X GET "http://localhost:5000/vehicle-inventory/manufacturers?category=suv&sortBy=displayName&sortOrder=ASC" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 14. Recently Founded Companies

```bash
curl -X GET "http://localhost:5000/vehicle-inventory/manufacturers?minFoundedYear=2000&sortBy=foundedYear&sortOrder=DESC" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 15. Oldest Companies

```bash
curl -X GET "http://localhost:5000/vehicle-inventory/manufacturers?maxFoundedYear=1950&sortBy=foundedYear&sortOrder=ASC" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Response Format

All responses follow this paginated format:

```json
{
  "data": [
    {
      "_id": "string",
      "name": "string",
      "displayName": "string",
      "originCountry": "string",
      "description": "string",
      "logo": "string",
      "website": "string",
      "foundedYear": "number",
      "headquarters": "string",
      "isActive": "boolean",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "total": "number",
  "page": "number",
  "limit": "number",
  "totalPages": "number",
  "hasNext": "boolean",
  "hasPrev": "boolean"
}
```

## Error Responses

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "timestamp": "2025-06-28T21:30:58.000Z",
  "path": "/vehicle-inventory/manufacturers"
}
```

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "sortBy",
      "message": "sortBy must be one of the following values: name, displayName, originCountry, foundedYear, headquarters, createdAt, updatedAt"
    }
  ]
}
```

## Notes

1. **Authentication Required**: All endpoints require a valid JWT token
2. **Case Insensitive**: Text searches and filters are case-insensitive
3. **Partial Matching**: Text filters use regex matching for partial matches
4. **Default Values**:
   - `page`: 1
   - `limit`: 20
   - `sortBy`: name
   - `sortOrder`: ASC
5. **Text Search**: Uses MongoDB text index on name, displayName, description, originCountry, and headquarters
6. **Category Mapping**: Categories are mapped to specific manufacturer names based on their characteristics
7. **Region Mapping**: Regions are mapped to specific countries

## Performance Tips

1. Use specific filters to reduce result set size
2. Combine multiple filters for precise results
3. Use pagination for large result sets
4. Use text search for finding specific manufacturers
5. Use category/region filters for broad categorization
