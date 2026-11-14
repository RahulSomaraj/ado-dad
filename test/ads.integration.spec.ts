import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection, disconnect } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('Ads API Integration Tests', () => {
  let app: INestApplication;
  let mongoConnection: Connection;
  let authToken: string;
  let userId: string;
  let manufacturerId: string;
  let vehicleModelId: string;
  let vehicleVariantId: string;
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
    // Clear test data
    if (mongoConnection.db) {
      await mongoConnection.db.collection('refreshtokens').deleteMany({
        $or: [{ phone: '1234567890' }, { email: 'test@example.com' }],
      });

      await mongoConnection.db.collection('manufacturers').deleteMany({
        name: 'test-manufacturer-integration',
      });

      await mongoConnection.db.collection('vehiclemodels').deleteMany({
        name: 'test-model-integration',
      });

      await mongoConnection.db.collection('vehiclevariants').deleteMany({
        name: 'test-variant-integration',
      });

      await mongoConnection.db.collection('fueltypes').deleteMany({
        name: 'petrol-integration',
      });

      await mongoConnection.db.collection('transmissiontypes').deleteMany({
        name: 'manual-integration',
      });

      await mongoConnection.db.collection('ads').deleteMany({
        $or: [
          { title: { $regex: /^Test.*Integration.*Ad$/ } },
          { seller: { $exists: true } },
        ],
      });

      await mongoConnection.db.collection('vehicleads').deleteMany({
        title: { $regex: /^Test.*Integration.*Ad$/ },
      });

      await mongoConnection.db.collection('propertyads').deleteMany({
        title: { $regex: /^Test.*Integration.*Ad$/ },
      });

      await mongoConnection.db.collection('commercialvehicleads').deleteMany({
        title: { $regex: /^Test.*Integration.*Ad$/ },
      });
    }

    // Create test user and login
    const userData = {
      phone: '1234567890',
      password: 'testPassword123',
      name: 'Test User Integration',
      email: 'test@example.com',
      userType: 'BUYER',
    };

    await request(app.getHttpServer()).post('/auth/register').send(userData);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: '1234567890',
        password: 'testPassword123',
      });

    authToken = loginResponse.body.token;
    userId = loginResponse.body.id;

    // Create required inventory data
    const manufacturerData = {
      name: 'test-manufacturer-integration',
      displayName: 'Test Manufacturer Integration',
      originCountry: 'India',
      logo: 'https://example.com/logo.png',
    };

    const manufacturerResponse = await request(app.getHttpServer())
      .post('/vehicle-inventory/manufacturers')
      .set('Authorization', `Bearer ${authToken}`)
      .send(manufacturerData);

    manufacturerId = manufacturerResponse.body._id;

    const modelData = {
      name: 'test-model-integration',
      displayName: 'Test Model Integration',
      manufacturer: manufacturerId,
      vehicleType: 'HATCHBACK',
      description: 'A test vehicle model for integration',
      launchYear: 2020,
      segment: 'B',
      bodyType: 'Hatchback',
    };

    const modelResponse = await request(app.getHttpServer())
      .post('/vehicle-inventory/vehicle-models')
      .set('Authorization', `Bearer ${authToken}`)
      .send(modelData);

    vehicleModelId = modelResponse.body._id;

    const variantData = {
      name: 'test-variant-integration',
      displayName: 'Test Variant Integration',
      vehicleModel: vehicleModelId,
      description: 'A test vehicle variant for integration',
      engineCapacity: 1200,
      fuelType: 'PETROL',
      transmissionType: 'MANUAL',
      mileage: 15.5,
      power: 85,
      torque: 115,
      price: 500000,
      features: ['ABS', 'Airbags', 'Power Steering'],
    };

    const variantResponse = await request(app.getHttpServer())
      .post('/vehicle-inventory/vehicle-variants')
      .set('Authorization', `Bearer ${authToken}`)
      .send(variantData);

    vehicleVariantId = variantResponse.body._id;

    // Create fuel type and transmission type
    const fuelTypeData = {
      name: 'petrol-integration',
      displayName: 'Petrol Integration',
      description: 'Petrol fuel type for integration',
    };

    const fuelTypeResponse = await request(app.getHttpServer())
      .post('/vehicle-inventory/fuel-types')
      .set('Authorization', `Bearer ${authToken}`)
      .send(fuelTypeData);

    fuelTypeId = fuelTypeResponse.body._id;

    const transmissionTypeData = {
      name: 'manual-integration',
      displayName: 'Manual Integration',
      description: 'Manual transmission for integration',
    };

    const transmissionTypeResponse = await request(app.getHttpServer())
      .post('/vehicle-inventory/transmission-types')
      .set('Authorization', `Bearer ${authToken}`)
      .send(transmissionTypeData);

    transmissionTypeId = transmissionTypeResponse.body._id;
  });

  describe('Complete Ad Lifecycle Tests', () => {
    it('should complete full property ad lifecycle', async () => {
      // 1. Create property ad
      const propertyAdData = {
        category: 'property',
        data: {
          description:
            'Test Property Integration Ad - Beautiful 3BHK apartment',
          price: 7500000,
          location: 'Mumbai, Maharashtra',
          images: [
            'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/property1.jpg',
            'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/property2.jpg',
          ],
        },
        property: {
          propertyType: 'apartment',
          bedrooms: 3,
          bathrooms: 3,
          areaSqft: 1500,
          floor: 8,
          isFurnished: true,
          hasParking: true,
          hasGarden: true,
          amenities: ['Gym', 'Swimming Pool', 'Security', 'Lift', 'Garden'],
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', 'test-property-lifecycle-1')
        .send(propertyAdData)
        .expect(201);

      const adId = createResponse.body.id;

      // 2. Get ad by ID
      const getResponse = await request(app.getHttpServer())
        .get(`/ads/${adId}`)
        .expect(200);

      expect(getResponse.body.id).toBe(adId);
      expect(getResponse.body.category).toBe('property');
      expect(getResponse.body.propertyDetails).toBeDefined();
      expect(getResponse.body.propertyDetails.bedrooms).toBe(3);
      expect(getResponse.body.propertyDetails.bathrooms).toBe(3);
      expect(getResponse.body.propertyDetails.areaSqft).toBe(1500);

      // 3. Update ad
      const updateData = {
        data: {
          description:
            'Updated Test Property Integration Ad - Beautiful 3BHK apartment with modern amenities',
          price: 8000000,
        },
        property: {
          bedrooms: 3,
          bathrooms: 3,
          areaSqft: 1600,
          amenities: [
            'Gym',
            'Swimming Pool',
            'Security',
            'Lift',
            'Garden',
            'Clubhouse',
          ],
        },
      };

      const updateResponse = await request(app.getHttpServer())
        .put(`/ads/v2/${adId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.price).toBe(8000000);
      expect(updateResponse.body.propertyDetails.areaSqft).toBe(1600);
      expect(updateResponse.body.propertyDetails.amenities).toContain(
        'Clubhouse',
      );

      // 4. Get user's ads
      const myAdsResponse = await request(app.getHttpServer())
        .post('/ads/my-ads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          page: 1,
          limit: 10,
          search: 'Test Property Integration',
        })
        .expect(200);

      expect(myAdsResponse.body.data).toHaveLength(1);
      expect(myAdsResponse.body.data[0].id).toBe(adId);

      // 5. Search ads
      const searchResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          category: 'property',
          minPrice: 7000000,
          maxPrice: 9000000,
          location: 'Mumbai',
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(1);
      expect(searchResponse.body.data[0].id).toBe(adId);

      // 6. Delete ad
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/ads/${adId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body.message).toBe(
        'Advertisement deleted successfully',
      );

      // 7. Verify ad is deleted
      await request(app.getHttpServer()).get(`/ads/${adId}`).expect(404);
    });

    it('should complete full vehicle ad lifecycle', async () => {
      // 1. Create vehicle ad
      const vehicleAdData = {
        category: 'private_vehicle',
        data: {
          description:
            'Test Vehicle Integration Ad - Honda City 2020 Model in excellent condition',
          price: 950000,
          location: 'Delhi, NCR',
          images: [
            'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/vehicle1.jpg',
            'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/vehicle2.jpg',
          ],
        },
        vehicle: {
          vehicleType: 'four_wheeler',
          manufacturerId: manufacturerId,
          modelId: vehicleModelId,
          variantId: vehicleVariantId,
          year: 2020,
          mileage: 30000,
          transmissionTypeId: transmissionTypeId,
          fuelTypeId: fuelTypeId,
          color: 'Silver',
          isFirstOwner: true,
          hasInsurance: true,
          hasRcBook: true,
          additionalFeatures: [
            'Sunroof',
            'Leather Seats',
            'Navigation System',
            'Reverse Camera',
            'Bluetooth Connectivity',
          ],
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', 'test-vehicle-lifecycle-1')
        .send(vehicleAdData)
        .expect(201);

      const adId = createResponse.body.id;

      // 2. Get ad by ID
      const getResponse = await request(app.getHttpServer())
        .get(`/ads/${adId}`)
        .expect(200);

      expect(getResponse.body.id).toBe(adId);
      expect(getResponse.body.category).toBe('private_vehicle');
      expect(getResponse.body.vehicleDetails).toBeDefined();
      expect(getResponse.body.vehicleDetails.vehicleType).toBe('four_wheeler');
      expect(getResponse.body.vehicleDetails.year).toBe(2020);
      expect(getResponse.body.vehicleDetails.mileage).toBe(30000);

      // 3. Update ad
      const updateData = {
        data: {
          description:
            'Updated Test Vehicle Integration Ad - Honda City 2020 Model with low mileage',
          price: 900000,
        },
        vehicle: {
          mileage: 25000,
          color: 'White',
          additionalFeatures: [
            'Sunroof',
            'Leather Seats',
            'Navigation System',
            'Reverse Camera',
            'Bluetooth Connectivity',
            'Wireless Charging',
          ],
        },
      };

      const updateResponse = await request(app.getHttpServer())
        .put(`/ads/v2/${adId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.price).toBe(900000);
      expect(updateResponse.body.vehicleDetails.mileage).toBe(25000);
      expect(updateResponse.body.vehicleDetails.color).toBe('White');
      expect(updateResponse.body.vehicleDetails.additionalFeatures).toContain(
        'Wireless Charging',
      );

      // 4. Search ads with filters
      const searchResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          category: 'private_vehicle',
          minPrice: 800000,
          maxPrice: 1000000,
          location: 'Delhi',
          vehicleType: 'four_wheeler',
          manufacturerId: [manufacturerId],
          modelId: [vehicleModelId],
          minYear: 2019,
          maxYear: 2021,
          maxMileage: 35000,
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(1);
      expect(searchResponse.body.data[0].id).toBe(adId);

      // 5. Delete ad
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/ads/${adId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body.message).toBe(
        'Advertisement deleted successfully',
      );
    });

    it('should complete full commercial vehicle ad lifecycle', async () => {
      // 1. Create commercial vehicle ad
      const commercialVehicleAdData = {
        category: 'commercial_vehicle',
        data: {
          description:
            'Test Commercial Vehicle Integration Ad - Tata 407 Truck for commercial use',
          price: 2200000,
          location: 'Pune, Maharashtra',
          images: [
            'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/truck1.jpg',
            'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/truck2.jpg',
          ],
        },
        commercial: {
          vehicleType: 'four_wheeler',
          manufacturerId: manufacturerId,
          modelId: vehicleModelId,
          variantId: vehicleVariantId,
          year: 2019,
          mileage: 90000,
          transmissionTypeId: transmissionTypeId,
          fuelTypeId: fuelTypeId,
          color: 'Blue',
          isFirstOwner: false,
          hasInsurance: true,
          hasRcBook: true,
          additionalFeatures: [
            'GPS Tracking',
            'Climate Control',
            'Safety Features',
            'Fleet Management',
          ],
          commercialVehicleType: 'truck',
          bodyType: 'flatbed',
          payloadCapacity: 6000,
          payloadUnit: 'kg',
          axleCount: 2,
          hasFitness: true,
          hasPermit: true,
          seatingCapacity: 3,
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/v2/ads')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', 'test-commercial-lifecycle-1')
        .send(commercialVehicleAdData)
        .expect(201);

      const adId = createResponse.body.id;

      // 2. Get ad by ID
      const getResponse = await request(app.getHttpServer())
        .get(`/ads/${adId}`)
        .expect(200);

      expect(getResponse.body.id).toBe(adId);
      expect(getResponse.body.category).toBe('commercial_vehicle');
      expect(getResponse.body.commercialVehicleDetails).toBeDefined();
      expect(
        getResponse.body.commercialVehicleDetails.commercialVehicleType,
      ).toBe('truck');
      expect(getResponse.body.commercialVehicleDetails.payloadCapacity).toBe(
        6000,
      );
      expect(getResponse.body.commercialVehicleDetails.axleCount).toBe(2);

      // 3. Update ad
      const updateData = {
        data: {
          description:
            'Updated Test Commercial Vehicle Integration Ad - Tata 407 Truck with valid permits',
          price: 2000000,
        },
        commercial: {
          payloadCapacity: 5500,
          seatingCapacity: 2,
          additionalFeatures: [
            'GPS Tracking',
            'Climate Control',
            'Safety Features',
            'Fleet Management',
            'Driver Fatigue Monitoring',
          ],
        },
      };

      const updateResponse = await request(app.getHttpServer())
        .put(`/ads/v2/${adId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.price).toBe(2000000);
      expect(updateResponse.body.commercialVehicleDetails.payloadCapacity).toBe(
        5500,
      );
      expect(updateResponse.body.commercialVehicleDetails.seatingCapacity).toBe(
        2,
      );
      expect(
        updateResponse.body.commercialVehicleDetails.additionalFeatures,
      ).toContain('Driver Fatigue Monitoring');

      // 4. Search ads with commercial vehicle filters
      const searchResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          category: 'commercial_vehicle',
          minPrice: 1800000,
          maxPrice: 2500000,
          location: 'Pune',
          commercialVehicleType: 'truck',
          bodyType: 'flatbed',
          minPayloadCapacity: 5000,
          maxPayloadCapacity: 7000,
          axleCount: 2,
          hasInsurance: true,
          hasFitness: true,
          hasPermit: true,
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(1);
      expect(searchResponse.body.data[0].id).toBe(adId);

      // 5. Delete ad
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/ads/${adId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body.message).toBe(
        'Advertisement deleted successfully',
      );
    });
  });

  describe('Advanced Search and Filtering Tests', () => {
    beforeEach(async () => {
      // Create multiple ads for testing
      const ads = [
        {
          category: 'property',
          data: {
            description: 'Test Property Search Ad 1 - 2BHK apartment',
            price: 5000000,
            location: 'Mumbai, Maharashtra',
            images: [],
          },
          property: {
            propertyType: 'apartment',
            bedrooms: 2,
            bathrooms: 2,
            areaSqft: 1200,
            floor: 5,
            isFurnished: true,
            hasParking: true,
            hasGarden: false,
            amenities: ['Gym', 'Swimming Pool'],
          },
        },
        {
          category: 'property',
          data: {
            description: 'Test Property Search Ad 2 - 3BHK apartment',
            price: 7500000,
            location: 'Mumbai, Maharashtra',
            images: [],
          },
          property: {
            propertyType: 'apartment',
            bedrooms: 3,
            bathrooms: 3,
            areaSqft: 1500,
            floor: 8,
            isFurnished: false,
            hasParking: true,
            hasGarden: true,
            amenities: ['Gym', 'Swimming Pool', 'Garden'],
          },
        },
        {
          category: 'private_vehicle',
          data: {
            description: 'Test Vehicle Search Ad 1 - Honda City',
            price: 850000,
            location: 'Delhi, NCR',
            images: [],
          },
          vehicle: {
            vehicleType: 'four_wheeler',
            manufacturerId: manufacturerId,
            modelId: vehicleModelId,
            variantId: vehicleVariantId,
            year: 2020,
            mileage: 25000,
            transmissionTypeId: transmissionTypeId,
            fuelTypeId: fuelTypeId,
            color: 'White',
            isFirstOwner: true,
            hasInsurance: true,
            hasRcBook: true,
            additionalFeatures: ['Sunroof', 'Leather Seats'],
          },
        },
        {
          category: 'private_vehicle',
          data: {
            description: 'Test Vehicle Search Ad 2 - Honda City',
            price: 950000,
            location: 'Delhi, NCR',
            images: [],
          },
          vehicle: {
            vehicleType: 'four_wheeler',
            manufacturerId: manufacturerId,
            modelId: vehicleModelId,
            variantId: vehicleVariantId,
            year: 2021,
            mileage: 15000,
            transmissionTypeId: transmissionTypeId,
            fuelTypeId: fuelTypeId,
            color: 'Silver',
            isFirstOwner: false,
            hasInsurance: true,
            hasRcBook: true,
            additionalFeatures: [
              'Sunroof',
              'Leather Seats',
              'Navigation System',
            ],
          },
        },
      ];

      for (const ad of ads) {
        await request(app.getHttpServer())
          .post('/v2/ads')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Idempotency-Key', `test-search-${Date.now()}-${Math.random()}`)
          .send(ad);
      }
    });

    it('should search ads by text', async () => {
      const searchResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          search: 'Honda City',
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(2);
      expect(searchResponse.body.data[0].description).toContain('Honda City');
      expect(searchResponse.body.data[1].description).toContain('Honda City');
    });

    it('should filter ads by price range', async () => {
      const searchResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          minPrice: 6000000,
          maxPrice: 8000000,
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(1);
      expect(searchResponse.body.data[0].price).toBe(7500000);
    });

    it('should filter ads by location', async () => {
      const searchResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          location: 'Delhi',
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(2);
      expect(searchResponse.body.data[0].location).toContain('Delhi');
      expect(searchResponse.body.data[1].location).toContain('Delhi');
    });

    it('should filter property ads by bedrooms', async () => {
      const searchResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          category: 'property',
          minBedrooms: 3,
          maxBedrooms: 3,
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(1);
      expect(searchResponse.body.data[0].propertyDetails.bedrooms).toBe(3);
    });

    it('should filter vehicle ads by year range', async () => {
      const searchResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          category: 'private_vehicle',
          minYear: 2021,
          maxYear: 2021,
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(1);
      expect(searchResponse.body.data[0].vehicleDetails.year).toBe(2021);
    });

    it('should filter vehicle ads by mileage', async () => {
      const searchResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          category: 'private_vehicle',
          maxMileage: 20000,
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(1);
      expect(searchResponse.body.data[0].vehicleDetails.mileage).toBe(15000);
    });

    it('should filter property ads by amenities', async () => {
      const searchResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          category: 'property',
          amenities: ['Garden'],
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(1);
      expect(searchResponse.body.data[0].propertyDetails.amenities).toContain(
        'Garden',
      );
    });

    it('should sort ads by price ascending', async () => {
      const searchResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          sortBy: 'price',
          sortOrder: 'ASC',
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(4);
      expect(searchResponse.body.data[0].price).toBe(5000000);
      expect(searchResponse.body.data[1].price).toBe(7500000);
      expect(searchResponse.body.data[2].price).toBe(850000);
      expect(searchResponse.body.data[3].price).toBe(950000);
    });

    it('should sort ads by price descending', async () => {
      const searchResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          sortBy: 'price',
          sortOrder: 'DESC',
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(4);
      expect(searchResponse.body.data[0].price).toBe(950000);
      expect(searchResponse.body.data[1].price).toBe(850000);
      expect(searchResponse.body.data[2].price).toBe(7500000);
      expect(searchResponse.body.data[3].price).toBe(5000000);
    });

    it('should paginate results correctly', async () => {
      const searchResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          page: 1,
          limit: 2,
        })
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(2);
      expect(searchResponse.body.total).toBe(4);
      expect(searchResponse.body.page).toBe(1);
      expect(searchResponse.body.limit).toBe(2);
      expect(searchResponse.body.totalPages).toBe(2);
    });

    it('should handle complex multi-criteria search', async () => {
      const searchResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          category: 'private_vehicle',
          minPrice: 800000,
          maxPrice: 1000000,
          location: 'Delhi',
          vehicleType: 'four_wheeler',
          manufacturerId: [manufacturerId],
          modelId: [vehicleModelId],
          minYear: 2020,
          maxYear: 2021,
          maxMileage: 30000,
          hasInsurance: true,
          hasRcBook: true,
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(2);
      searchResponse.body.data.forEach((ad) => {
        expect(ad.category).toBe('private_vehicle');
        expect(ad.location).toContain('Delhi');
        expect(ad.vehicleDetails.vehicleType).toBe('four_wheeler');
        expect(ad.vehicleDetails.hasInsurance).toBe(true);
        expect(ad.vehicleDetails.hasRcBook).toBe(true);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid ad ID gracefully', async () => {
      await request(app.getHttpServer()).get('/ads/invalid-id').expect(400);
    });

    it('should handle non-existent ad ID gracefully', async () => {
      const fakeId = '507f1f77bcf86cd799439999';
      await request(app.getHttpServer()).get(`/ads/${fakeId}`).expect(404);
    });

    it('should handle malformed search request', async () => {
      await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          minPrice: 'invalid',
          maxPrice: 'invalid',
        })
        .expect(400);
    });

    it('should handle empty search request', async () => {
      const searchResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({})
        .expect(200);

      expect(searchResponse.body.data).toBeDefined();
      expect(Array.isArray(searchResponse.body.data)).toBe(true);
    });

    it('should handle large page numbers gracefully', async () => {
      const searchResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          page: 999999,
          limit: 10,
        })
        .expect(200);

      expect(searchResponse.body.data).toHaveLength(0);
      expect(searchResponse.body.page).toBe(999999);
    });

    it('should handle large limit values gracefully', async () => {
      const searchResponse = await request(app.getHttpServer())
        .post('/ads/list')
        .send({
          page: 1,
          limit: 1000,
        })
        .expect(200);

      expect(searchResponse.body.data).toBeDefined();
      expect(Array.isArray(searchResponse.body.data)).toBe(true);
    });
  });
});
