import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection, disconnect } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('Ads API - Minimal Data Test Cases (e2e)', () => {
  let app: INestApplication;
  let mongoConnection: Connection;
  let authToken: string;
  let userId: string;
  let manufacturerId: string;
  let vehicleModelId: string;
  let fuelTypeId: string;
  let transmissionTypeId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    mongoConnection = moduleFixture.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clear test data before each test
    if (mongoConnection.db) {
      await mongoConnection.db.collection('refreshtokens').deleteMany({});
      await mongoConnection.db.collection('manufacturers').deleteMany({});
      await mongoConnection.db.collection('vehiclemodels').deleteMany({});
      await mongoConnection.db.collection('vehiclevariants').deleteMany({});
      await mongoConnection.db.collection('fueltypes').deleteMany({});
      await mongoConnection.db.collection('transmissiontypes').deleteMany({});
      await mongoConnection.db.collection('ads').deleteMany({});
      await mongoConnection.db.collection('vehicleads').deleteMany({});
      await mongoConnection.db.collection('propertyads').deleteMany({});
      await mongoConnection.db
        .collection('commercialvehicleads')
        .deleteMany({});
    }

    // Create a test user and login for authenticated tests
    const userData = {
      name: 'Test Admin User',
      phoneNumber: '9876543210', // Different phone number to avoid conflicts
      email: 'admin@example.com',
      password: 'testPassword123',
      type: 'AD', // Admin User - has permission to create ads
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/users')
      .send(userData);
    console.log(
      'REGISTER RESPONSE:',
      JSON.stringify(registerResponse.body, null, 2),
    );

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: '9876543210', // Can be phone, email, or name
        password: 'testPassword123',
      });

    console.log('LOGIN RESPONSE:', JSON.stringify(loginResponse.body, null, 2));

    authToken = loginResponse.body.token.replace('Bearer ', ''); // Remove "Bearer " prefix for JWT validation
    userId = loginResponse.body.id;

    // Create required inventory data for vehicle ads
    const manufacturerData = {
      name: 'test-manufacturer',
      displayName: 'Test Manufacturer',
      originCountry: 'India',
      logo: 'https://example.com/logo.png',
    };

    const manufacturerResponse = await request(app.getHttpServer())
      .post('/vehicle-inventory/manufacturers')
      .set('Authorization', `Bearer ${authToken}`)
      .send(manufacturerData);

    console.log(
      'MANUFACTURER RESPONSE:',
      JSON.stringify(manufacturerResponse.body, null, 2),
    );
    manufacturerId = manufacturerResponse.body._id;

    const modelData = {
      name: 'test-model',
      displayName: 'Test Model',
      manufacturer: manufacturerId,
      vehicleType: 'Hatchback', // Use correct enum value
      description: 'A test vehicle model',
      launchYear: 2020,
      segment: 'B',
      bodyType: 'Hatchback',
    };

    const modelResponse = await request(app.getHttpServer())
      .post('/vehicle-inventory/models')
      .set('Authorization', `Bearer ${authToken}`)
      .send(modelData);

    console.log('MODEL RESPONSE:', JSON.stringify(modelResponse.body, null, 2));
    vehicleModelId = modelResponse.body._id;

    // Get existing fuel types and transmission types (these should be seeded)
    const fuelTypesResponse = await request(app.getHttpServer())
      .get('/vehicle-inventory/fuel-types')
      .set('Authorization', `Bearer ${authToken}`);

    console.log(
      'FUEL TYPES RESPONSE:',
      JSON.stringify(fuelTypesResponse.body, null, 2),
    );
    
    // Use the first available fuel type, or create a default one if none exist
    if (fuelTypesResponse.body && fuelTypesResponse.body.length > 0) {
      fuelTypeId = fuelTypesResponse.body[0]._id;
    } else {
      // If no fuel types exist, we'll need to handle this case
      console.log('No fuel types found, will need to create one');
      fuelTypeId = 'default-fuel-type-id'; // This will cause the test to fail, but we'll see the error
    }

    const transmissionTypesResponse = await request(app.getHttpServer())
      .get('/vehicle-inventory/transmission-types')
      .set('Authorization', `Bearer ${authToken}`);

    console.log(
      'TRANSMISSION TYPES RESPONSE:',
      JSON.stringify(transmissionTypesResponse.body, null, 2),
    );
    
    // Use the first available transmission type, or create a default one if none exist
    if (transmissionTypesResponse.body && transmissionTypesResponse.body.length > 0) {
      transmissionTypeId = transmissionTypesResponse.body[0]._id;
    } else {
      // If no transmission types exist, we'll need to handle this case
      console.log('No transmission types found, will need to create one');
      transmissionTypeId = 'default-transmission-type-id'; // This will cause the test to fail, but we'll see the error
    }
  });

  describe('Property Ads - Minimal Data Tests', () => {
    describe('POST /ads - Property Category', () => {
      it('should create property ad with minimal required data', () => {
        const minimalPropertyAd = {
          category: 'property',
          data: {
            description: '1BHK apartment for sale',
            price: 500000,
            location: 'Mumbai, Maharashtra',
            propertyType: 'apartment',
            bedrooms: 1,
            bathrooms: 1,
            areaSqft: 500,
          },
        };

        return request(app.getHttpServer())
          .post('/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(minimalPropertyAd)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty(
              'description',
              minimalPropertyAd.data.description,
            );
            expect(res.body).toHaveProperty(
              'price',
              minimalPropertyAd.data.price,
            );
            expect(res.body).toHaveProperty(
              'location',
              minimalPropertyAd.data.location,
            );
            expect(res.body).toHaveProperty('category', 'property');
            expect(res.body).toHaveProperty('isActive', true);
            expect(res.body).toHaveProperty('postedBy');
            expect(res.body.postedBy).toHaveProperty('_id');
            expect(res.body.postedBy._id).toBe(userId);
          });
      });

      it('should create property ad with all optional fields', () => {
        const completePropertyAd = {
          category: 'property',
          data: {
            description: 'Luxury 3BHK villa with modern amenities',
            price: 25000000,
            location: 'Bangalore, Karnataka',
            images: [
              'https://example.com/villa1.jpg',
              'https://example.com/villa2.jpg',
            ],
            propertyType: 'villa',
            bedrooms: 3,
            bathrooms: 3,
            areaSqft: 2500,
            floor: 2,
            isFurnished: true,
            hasParking: true,
            hasGarden: true,
            amenities: ['Gym', 'Swimming Pool', 'Garden', 'Security'],
          },
        };

        return request(app.getHttpServer())
          .post('/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(completePropertyAd)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty(
              'description',
              completePropertyAd.data.description,
            );
            expect(res.body).toHaveProperty(
              'price',
              completePropertyAd.data.price,
            );
            expect(res.body).toHaveProperty(
              'images',
              completePropertyAd.data.images,
            );
          });
      });

      it('should fail to create property ad with missing required fields', () => {
        const invalidPropertyAd = {
          category: 'property',
          data: {
            description: '1BHK apartment for sale',
            price: 500000,
            location: 'Mumbai, Maharashtra',
            // Missing: propertyType, bedrooms, bathrooms, areaSqft
          },
        };

        return request(app.getHttpServer())
          .post('/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidPropertyAd)
          .expect(400);
      });

      it('should fail to create property ad with invalid property type', () => {
        const invalidPropertyAd = {
          category: 'property',
          data: {
            description: '1BHK apartment for sale',
            price: 500000,
            location: 'Mumbai, Maharashtra',
            propertyType: 'invalid_type',
            bedrooms: 1,
            bathrooms: 1,
            areaSqft: 500,
          },
        };

        return request(app.getHttpServer())
          .post('/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidPropertyAd)
          .expect(400);
      });
    });
  });

  describe('Private Vehicle Ads - Minimal Data Tests', () => {
    describe('POST /ads - Private Vehicle Category', () => {
      it('should create private vehicle ad with minimal required data', () => {
        const minimalVehicleAd = {
          category: 'private_vehicle',
          data: {
            description: 'Maruti Swift 2018 for sale',
            price: 450000,
            location: 'Gurgaon, Haryana',
            vehicleType: 'four_wheeler',
            manufacturerId: manufacturerId,
            modelId: vehicleModelId,
            year: 2018,
            mileage: 45000,
            transmissionTypeId: transmissionTypeId,
            fuelTypeId: fuelTypeId,
            color: 'Silver',
          },
        };

        console.log(
          'MINIMAL VEHICLE AD DATA:',
          JSON.stringify(minimalVehicleAd, null, 2),
        );
        console.log(
          'INVENTORY IDs - manufacturerId:',
          manufacturerId,
          'modelId:',
          vehicleModelId,
          'fuelTypeId:',
          fuelTypeId,
          'transmissionTypeId:',
          transmissionTypeId,
        );

        return request(app.getHttpServer())
          .post('/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(minimalVehicleAd)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty(
              'description',
              minimalVehicleAd.data.description,
            );
            expect(res.body).toHaveProperty(
              'price',
              minimalVehicleAd.data.price,
            );
            expect(res.body).toHaveProperty('category', 'private_vehicle');
          });
      });

      it('should create private vehicle ad with all optional fields', () => {
        const completeVehicleAd = {
          category: 'private_vehicle',
          data: {
            description: 'Honda City 2020 - Single Owner, Excellent Condition',
            price: 850000,
            location: 'Dwarka, Delhi, NCR',
            images: [
              'https://example.com/car1.jpg',
              'https://example.com/car2.jpg',
            ],
            vehicleType: 'four_wheeler',
            manufacturerId: manufacturerId,
            modelId: vehicleModelId,
            year: 2020,
            mileage: 25000,
            transmissionTypeId: transmissionTypeId,
            fuelTypeId: fuelTypeId,
            color: 'White',
            isFirstOwner: true,
            hasInsurance: true,
            hasRcBook: true,
            additionalFeatures: [
              'Sunroof',
              'Leather Seats',
              'Navigation System',
            ],
          },
        };

        return request(app.getHttpServer())
          .post('/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(completeVehicleAd)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty(
              'description',
              completeVehicleAd.data.description,
            );
            expect(res.body).toHaveProperty(
              'price',
              completeVehicleAd.data.price,
            );
          });
      });

      it('should fail to create vehicle ad with missing required fields', () => {
        const invalidVehicleAd = {
          category: 'private_vehicle',
          data: {
            description: 'Maruti Swift 2018 for sale',
            price: 450000,
            location: 'Gurgaon, Haryana',
            // Missing: vehicleType, manufacturerId, modelId, year, mileage, transmissionTypeId, fuelTypeId, color
          },
        };

        return request(app.getHttpServer())
          .post('/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidVehicleAd)
          .expect(400);
      });

      it('should fail to create vehicle ad with invalid vehicle type', () => {
        const invalidVehicleAd = {
          category: 'private_vehicle',
          data: {
            description: 'Maruti Swift 2018 for sale',
            price: 450000,
            location: 'Gurgaon, Haryana',
            vehicleType: 'invalid_type',
            manufacturerId: manufacturerId,
            modelId: vehicleModelId,
            year: 2018,
            mileage: 45000,
            transmissionTypeId: transmissionTypeId,
            fuelTypeId: fuelTypeId,
            color: 'Silver',
          },
        };

        return request(app.getHttpServer())
          .post('/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidVehicleAd)
          .expect(400);
      });
    });
  });

  describe('Two Wheeler Ads - Minimal Data Tests', () => {
    describe('POST /ads - Two Wheeler Category', () => {
      it('should create two wheeler ad with minimal required data', () => {
        const minimalTwoWheelerAd = {
          category: 'two_wheeler',
          data: {
            description: 'Honda Activa 6G for sale',
            price: 65000,
            location: 'Koramangala, Bangalore, Karnataka',
            vehicleType: 'two_wheeler',
            manufacturerId: manufacturerId,
            modelId: vehicleModelId,
            year: 2021,
            mileage: 12000,
            transmissionTypeId: transmissionTypeId,
            fuelTypeId: fuelTypeId,
            color: 'Red',
          },
        };

        return request(app.getHttpServer())
          .post('/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(minimalTwoWheelerAd)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty(
              'description',
              minimalTwoWheelerAd.data.description,
            );
            expect(res.body).toHaveProperty(
              'price',
              minimalTwoWheelerAd.data.price,
            );
            expect(res.body).toHaveProperty('category', 'two_wheeler');
          });
      });

      it('should create two wheeler ad with all optional fields', () => {
        const completeTwoWheelerAd = {
          category: 'two_wheeler',
          data: {
            description: 'Bajaj Pulsar 150 - Single Owner, Low Mileage',
            price: 85000,
            location: 'Dwarka, Delhi',
            images: [
              'https://example.com/bike1.jpg',
              'https://example.com/bike2.jpg',
            ],
            vehicleType: 'two_wheeler',
            manufacturerId: manufacturerId,
            modelId: vehicleModelId,
            year: 2019,
            mileage: 25000,
            transmissionTypeId: transmissionTypeId,
            fuelTypeId: fuelTypeId,
            color: 'Black',
            isFirstOwner: true,
            hasInsurance: true,
            hasRcBook: true,
            additionalFeatures: [
              'Digital Console',
              'LED Headlight',
              'Mobile Charging Port',
            ],
          },
        };

        return request(app.getHttpServer())
          .post('/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(completeTwoWheelerAd)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty(
              'description',
              completeTwoWheelerAd.data.description,
            );
            expect(res.body).toHaveProperty(
              'price',
              completeTwoWheelerAd.data.price,
            );
          });
      });
    });
  });

  describe('Commercial Vehicle Ads - Minimal Data Tests', () => {
    describe('POST /ads - Commercial Vehicle Category', () => {
      it('should create commercial vehicle ad with minimal required data', () => {
        const minimalCommercialVehicleAd = {
          category: 'commercial_vehicle',
          data: {
            description: 'Tata 407 truck for sale',
            price: 850000,
            location: 'Mumbai, Maharashtra',
            vehicleType: 'four_wheeler',
            commercialVehicleType: 'truck',
            bodyType: 'flatbed',
            manufacturerId: manufacturerId,
            modelId: vehicleModelId,
            year: 2018,
            mileage: 125000,
            payloadCapacity: 4000,
            payloadUnit: 'kg',
            axleCount: 2,
            transmissionTypeId: transmissionTypeId,
            fuelTypeId: fuelTypeId,
            color: 'White',
          },
        };

        return request(app.getHttpServer())
          .post('/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(minimalCommercialVehicleAd)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty(
              'description',
              minimalCommercialVehicleAd.data.description,
            );
            expect(res.body).toHaveProperty(
              'price',
              minimalCommercialVehicleAd.data.price,
            );
            expect(res.body).toHaveProperty('category', 'commercial_vehicle');
          });
      });

      it('should create commercial vehicle ad with all optional fields', () => {
        const completeCommercialVehicleAd = {
          category: 'commercial_vehicle',
          data: {
            description: 'Mahindra Bolero Pickup - Perfect for Business',
            price: 450000,
            location: 'Chennai, Tamil Nadu',
            images: [
              'https://example.com/truck1.jpg',
              'https://example.com/truck2.jpg',
            ],
            vehicleType: 'four_wheeler',
            commercialVehicleType: 'truck',
            bodyType: 'pickup',
            manufacturerId: manufacturerId,
            modelId: vehicleModelId,
            year: 2020,
            mileage: 35000,
            payloadCapacity: 1000,
            payloadUnit: 'kg',
            axleCount: 2,
            transmissionTypeId: transmissionTypeId,
            fuelTypeId: fuelTypeId,
            color: 'White',
            hasInsurance: true,
            hasFitness: true,
            hasPermit: true,
            additionalFeatures: ['Power Steering', 'AC Cabin', 'Music System'],
            seatingCapacity: 3,
          },
        };

        return request(app.getHttpServer())
          .post('/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(completeCommercialVehicleAd)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty(
              'description',
              completeCommercialVehicleAd.data.description,
            );
            expect(res.body).toHaveProperty(
              'price',
              completeCommercialVehicleAd.data.price,
            );
          });
      });

      it('should fail to create commercial vehicle ad with missing required fields', () => {
        const invalidCommercialVehicleAd = {
          category: 'commercial_vehicle',
          data: {
            description: 'Tata 407 truck for sale',
            price: 850000,
            location: 'Mumbai, Maharashtra',
            // Missing: vehicleType, commercialVehicleType, bodyType, manufacturerId, modelId, year, mileage, payloadCapacity, payloadUnit, axleCount, transmissionTypeId, fuelTypeId, color
          },
        };

        return request(app.getHttpServer())
          .post('/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidCommercialVehicleAd)
          .expect(400);
      });
    });
  });

  describe('Edge Cases and Validation Tests', () => {
    describe('POST /ads - Edge Cases', () => {
      it('should fail to create ad without authentication', () => {
        const adData = {
          category: 'property',
          data: {
            description: 'Test property',
            price: 500000,
            location: 'Mumbai, Maharashtra',
            propertyType: 'apartment',
            bedrooms: 1,
            bathrooms: 1,
            areaSqft: 500,
          },
        };

        return request(app.getHttpServer())
          .post('/ads')
          .send(adData)
          .expect(401);
      });

      it('should fail to create ad with invalid category', () => {
        const invalidAd = {
          category: 'invalid_category',
          data: {
            description: 'Test ad',
            price: 500000,
            location: 'Mumbai, Maharashtra',
          },
        };

        return request(app.getHttpServer())
          .post('/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidAd)
          .expect(400);
      });

      it('should fail to create ad with negative price', () => {
        const invalidAd = {
          category: 'property',
          data: {
            description: 'Test property',
            price: -500000,
            location: 'Mumbai, Maharashtra',
            propertyType: 'apartment',
            bedrooms: 1,
            bathrooms: 1,
            areaSqft: 500,
          },
        };

        return request(app.getHttpServer())
          .post('/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidAd)
          .expect(400);
      });

      it('should fail to create ad with empty description', () => {
        const invalidAd = {
          category: 'property',
          data: {
            description: '',
            price: 500000,
            location: 'Mumbai, Maharashtra',
            propertyType: 'apartment',
            bedrooms: 1,
            bathrooms: 1,
            areaSqft: 500,
          },
        };

        return request(app.getHttpServer())
          .post('/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidAd)
          .expect(400);
      });

      it('should fail to create ad with invalid manufacturer ID', () => {
        const invalidAd = {
          category: 'private_vehicle',
          data: {
            description: 'Test vehicle',
            price: 500000,
            location: 'Mumbai, Maharashtra',
            vehicleType: 'four_wheeler',
            manufacturerId: 'invalid_id',
            modelId: vehicleModelId,
            year: 2018,
            mileage: 45000,
            transmissionTypeId: transmissionTypeId,
            fuelTypeId: fuelTypeId,
            color: 'Silver',
          },
        };

        return request(app.getHttpServer())
          .post('/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidAd)
          .expect(400);
      });
    });
  });

  describe('GET /ads - Retrieval Tests', () => {
    beforeEach(async () => {
      // Create test ads for retrieval tests
      const propertyAd = {
        category: 'property',
        data: {
          description: 'Test property ad',
          price: 500000,
          location: 'Mumbai, Maharashtra',
          propertyType: 'apartment',
          bedrooms: 1,
          bathrooms: 1,
          areaSqft: 500,
        },
      };

      const vehicleAd = {
        category: 'private_vehicle',
        data: {
          description: 'Test vehicle ad',
          price: 450000,
          location: 'Gurgaon, Haryana',
          vehicleType: 'four_wheeler',
          manufacturerId: manufacturerId,
          modelId: vehicleModelId,
          year: 2018,
          mileage: 45000,
          transmissionTypeId: transmissionTypeId,
          fuelTypeId: fuelTypeId,
          color: 'Silver',
        },
      };

      await request(app.getHttpServer())
        .post('/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(propertyAd);

      await request(app.getHttpServer())
        .post('/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(vehicleAd);
    });

    it('should get all ads successfully', () => {
      return request(app.getHttpServer())
        .get('/ads')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
        });
    });

    it('should filter ads by category', () => {
      return request(app.getHttpServer())
        .get('/ads?category=property')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          res.body.data.forEach((ad) => {
            expect(ad.category).toBe('property');
          });
        });
    });

    it('should filter ads by price range', () => {
      return request(app.getHttpServer())
        .get('/ads?minPrice=400000&maxPrice=600000')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          res.body.data.forEach((ad) => {
            expect(ad.price).toBeGreaterThanOrEqual(400000);
            expect(ad.price).toBeLessThanOrEqual(600000);
          });
        });
    });

    it('should search ads by description', () => {
      return request(app.getHttpServer())
        .get('/ads?search=test')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });
  });
});
