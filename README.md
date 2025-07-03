# ado-dad

olx clone

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup
=======
# AdodDad Advertisement System

A complete NestJS backend for the AdodDad "Post an Ad" and "Browse Ads" modules supporting three categories: **Properties**, **Private Vehicles** (2-wheelers & 4-wheelers), and **Commercial Vehicles** (trucks, vans, buses).

## 🚀 Features

- **Multi-category Advertisement System**: Support for Properties, Private Vehicles, and Commercial Vehicles
- **Advanced Filtering & Search**: Comprehensive filtering options for each category
- **Image Upload**: AWS S3 integration for image storage
- **TypeORM + PostgreSQL**: Robust database management with TypeORM
- **JWT Authentication**: Secure user authentication and authorization
- **Swagger Documentation**: Complete API documentation
- **Docker Support**: Containerized deployment with Docker and Docker Compose
- **Unit Tests**: Comprehensive test coverage
- **Pagination**: Efficient data pagination for large datasets

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (optional, for caching)
- Docker & Docker Compose (for containerized deployment)
- AWS S3 bucket (for image storage)

## 🛠️ Installation

### Local Development Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd ado-dad
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:

   ```env
   # Database Configuration
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_NAME=adodad_db
   DATABASE_USERNAME=adodad_user
   DATABASE_PASSWORD=adodad_password

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key
   TOKEN_KEY=your-token-key

   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=your-s3-bucket-name

   # Redis Configuration (Optional)
   REDIS_HOST=localhost
   REDIS_PORT=6379

   # Application Configuration
   NODE_ENV=development
   PORT=3000
   ```

4. **Database Setup**

   ```bash
   # Create PostgreSQL database
   createdb adodad_db

   # Run migrations (if using TypeORM migrations)
   npm run migration:run
   ```

5. **Seed Data (Optional)**

   ```bash
   npm run seed
   ```

6. **Start the application**

   ```bash
   # Development mode
   npm run start:dev

   # Production mode
   npm run start:prod
   ```

### Docker Deployment

1. **Build and run with Docker Compose**

   ```bash
   # Build and start all services
   docker-compose up -d

   # View logs
   docker-compose logs -f app

   # Stop services
   docker-compose down
   ```

2. **Production deployment with Nginx**
   ```bash
   docker-compose --profile production up -d
   ```

## 📚 API Documentation

Once the application is running, you can access the Swagger documentation at:

```
http://localhost:3000/api-docs
```

### Main Endpoints

#### Advertisements

- `GET /ads` - Get all advertisements with filtering and pagination
- `GET /ads/:id` - Get advertisement by ID
- `POST /ads/property` - Create property advertisement
- `POST /ads/vehicle` - Create vehicle advertisement
- `POST /ads/commercial-vehicle` - Create commercial vehicle advertisement
- `PUT /ads/:id` - Update advertisement
- `DELETE /ads/:id` - Delete advertisement
- `GET /ads/my-ads` - Get current user advertisements
- `POST /ads/upload-images` - Upload advertisement images

#### Lookup Data

- `GET /lookup/manufacturers` - Get all manufacturers
- `GET /lookup/vehicle-models` - Get all vehicle models
- `GET /lookup/fuel-types` - Get all fuel types
- `GET /lookup/transmission-types` - Get all transmission types
- `GET /lookup/property-types` - Get all property types

### Filtering Examples

#### Property Advertisements

```bash
GET /ads?category=property&minPrice=100000&maxPrice=500000&minBedrooms=2&maxBedrooms=4&isFurnished=true
```

#### Vehicle Advertisements

```bash
GET /ads?category=private&vehicleType=four_wheeler&manufacturerId=uuid&minYear=2018&maxMileage=50000&transmissionTypeId=uuid
```

#### Commercial Vehicle Advertisements

```bash
GET /ads?category=commercial&commercialVehicleType=truck&minPayloadCapacity=5&maxPayloadCapacity=20&axleCount=2
```

## 🏗️ Database Schema

### Core Entities

#### Ad (Base Entity)

- `id` (UUID, Primary Key)
- `title` (VARCHAR)
- `description` (TEXT)
- `price` (DECIMAL)
- `images` (ARRAY)
- `location` (VARCHAR)
- `category` (ENUM: property, private, commercial)
- `isActive` (BOOLEAN)
- `postedAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)
- `postedBy` (UUID, Foreign Key to User)

#### PropertyAd

- `id` (UUID, Primary Key, Foreign Key to Ad)
- `propertyType` (ENUM)
- `bedrooms` (INTEGER)
- `bathrooms` (INTEGER)
- `areaSqft` (DECIMAL)
- `floor` (VARCHAR)
- `isFurnished` (BOOLEAN)
- `hasParking` (BOOLEAN)
- `hasGarden` (BOOLEAN)
- `amenities` (VARCHAR)

#### VehicleAd

- `id` (UUID, Primary Key, Foreign Key to Ad)
- `vehicleType` (ENUM: two_wheeler, four_wheeler)
- `manufacturerId` (UUID, Foreign Key)
- `modelId` (UUID, Foreign Key)
- `variant` (VARCHAR)
- `year` (INTEGER)
- `mileage` (DECIMAL)
- `transmissionTypeId` (UUID, Foreign Key)
- `fuelTypes` (Many-to-Many with FuelType)
- `color` (VARCHAR)
- `isFirstOwner` (BOOLEAN)
- `hasInsurance` (BOOLEAN)
- `hasRcBook` (BOOLEAN)
- `additionalFeatures` (VARCHAR)

#### CommercialVehicleAd

- `id` (UUID, Primary Key, Foreign Key to Ad)
- `vehicleType` (ENUM: truck, van, bus, tractor, trailer, forklift)
- `bodyType` (ENUM: flatbed, container, refrigerated, tanker, dump, pickup, box, passenger)
- `manufacturerId` (UUID, Foreign Key)
- `modelId` (UUID, Foreign Key)
- `variant` (VARCHAR)
- `year` (INTEGER)
- `mileage` (DECIMAL)
- `payloadCapacity` (DECIMAL)
- `payloadUnit` (VARCHAR)
- `axleCount` (INTEGER)
- `transmissionTypeId` (UUID, Foreign Key)
- `fuelTypes` (Many-to-Many with FuelType)
- `color` (VARCHAR)
- `hasInsurance` (BOOLEAN)
- `hasFitness` (BOOLEAN)
- `hasPermit` (BOOLEAN)
- `additionalFeatures` (VARCHAR)
- `seatingCapacity` (INTEGER)

### Lookup Tables

- `Manufacturer` - Vehicle manufacturers
- `VehicleModel` - Vehicle models (related to manufacturers)
- `FuelType` - Fuel types (Petrol, Diesel, Electric, etc.)
- `TransmissionType` - Transmission types (Manual, Automatic, etc.)
- `PropertyType` - Property types (Apartment, House, Villa, etc.)

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Test in watch mode
npm run test:watch
```

### Test Coverage

The application includes comprehensive unit tests for:

- Controllers (AdsController, LookupController)
- Services (AdsService, LookupService)
- DTOs validation
- Entity relationships

## 🔧 Configuration

### Environment Variables

| Variable                | Description       | Default     |
| ----------------------- | ----------------- | ----------- |
| `DATABASE_HOST`         | PostgreSQL host   | localhost   |
| `DATABASE_PORT`         | PostgreSQL port   | 5432        |
| `DATABASE_NAME`         | Database name     | adodad_db   |
| `DATABASE_USERNAME`     | Database username | adodad_user |
| `DATABASE_PASSWORD`     | Database password | -           |
| `JWT_SECRET`            | JWT secret key    | -           |
| `TOKEN_KEY`             | Token key         | -           |
| `AWS_ACCESS_KEY_ID`     | AWS access key    | -           |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key    | -           |
| `AWS_REGION`            | AWS region        | us-east-1   |
| `AWS_S3_BUCKET`         | S3 bucket name    | -           |
| `REDIS_HOST`            | Redis host        | localhost   |
| `REDIS_PORT`            | Redis port        | 6379        |
| `NODE_ENV`              | Environment       | development |
| `PORT`                  | Application port  | 3000        |

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**

   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export DATABASE_HOST=your-production-db-host
   export AWS_ACCESS_KEY_ID=your-production-aws-key
   # ... other production variables
   ```

2. **Build Application**

   ```bash
   npm run build
   ```

3. **Database Migration**

   ```bash
   npm run migration:run
   ```

4. **Start Application**
   ```bash
   npm run start:prod
   ```

### Docker Production Deployment

```bash
# Build and deploy with production profile
docker-compose --profile production up -d

# Monitor logs
docker-compose logs -f app

# Scale application
docker-compose up -d --scale app=3
```

## 📝 API Usage Examples

### Create Property Advertisement

```bash
curl -X POST http://localhost:3000/ads/property \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Beautiful 2BHK Apartment",
    "description": "Spacious apartment in prime location",
    "price": 2500000,
    "location": "Mumbai, Maharashtra",
    "category": "property",
    "propertyType": "apartment",
    "bedrooms": 2,
    "bathrooms": 2,
    "areaSqft": 1200,
    "isFurnished": true,
    "hasParking": true
  }'
```

### Create Vehicle Advertisement

```bash
curl -X POST http://localhost:3000/ads/vehicle \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Honda City 2020",
    "description": "Well maintained Honda City",
    "price": 850000,
    "location": "Delhi, NCR",
    "category": "private",
    "vehicleType": "four_wheeler",
    "manufacturerId": "manufacturer-uuid",
    "modelId": "model-uuid",
    "year": 2020,
    "mileage": 45000,
    "transmissionTypeId": "transmission-uuid",
    "fuelTypeIds": ["fuel-type-uuid"],
    "color": "White",
    "isFirstOwner": true,
    "hasInsurance": true,
    "hasRcBook": true
  }'
```

### Search Advertisements

```bash
# Search properties in specific price range
curl "http://localhost:3000/ads?category=property&minPrice=1000000&maxPrice=5000000&location=Mumbai"

# Search vehicles by manufacturer and year
curl "http://localhost:3000/ads?category=private&manufacturerId=manufacturer-uuid&minYear=2018&maxYear=2022"

# Search commercial vehicles by payload capacity
curl "http://localhost:3000/ads?category=commercial&minPayloadCapacity=5&maxPayloadCapacity=15"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the API documentation at `/api-docs`

## 🔄 Changelog

### Version 1.0.0

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
=======
- Initial release
- Complete advertisement system with three categories
- Advanced filtering and search capabilities
- Image upload functionality
- Comprehensive API documentation
- Docker support
- Unit test coverage
