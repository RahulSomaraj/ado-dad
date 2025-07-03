import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ad, AdDocument } from '../schemas/ad.schema';
import { PropertyAd, PropertyAdDocument } from '../schemas/property-ad.schema';
import { VehicleAd, VehicleAdDocument } from '../schemas/vehicle-ad.schema';
import {
  CommercialVehicleAd,
  CommercialVehicleAdDocument,
} from '../schemas/commercial-vehicle-ad.schema';
import { AdCategory } from '../schemas/ad.schema';
import { PropertyTypeEnum } from '../schemas/property-ad.schema';
import { VehicleTypeEnum } from '../schemas/vehicle-ad.schema';
import {
  CommercialVehicleTypeEnum,
  BodyTypeEnum,
} from '../schemas/commercial-vehicle-ad.schema';

const ASSET_IMAGE_NAMES = [
  'orange_benz.png',
  'silver_car.png',
  'orange_car.png',
  'red_scooter.png',
  'bike_hornet.png',
];

const ASSET_BASE_URL = 'https://uat.ado-dad.com/upload/images';

function getRandomImages(count = 3) {
  // Shuffle and pick 'count' images
  const shuffled = ASSET_IMAGE_NAMES.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map((name) => `${ASSET_BASE_URL}/${name}`);
}

@Injectable()
export class AdsSeedService {
  constructor(
    @InjectModel(Ad.name) private readonly adModel: Model<AdDocument>,
    @InjectModel(PropertyAd.name)
    private readonly propertyAdModel: Model<PropertyAdDocument>,
    @InjectModel(VehicleAd.name)
    private readonly vehicleAdModel: Model<VehicleAdDocument>,
    @InjectModel(CommercialVehicleAd.name)
    private readonly commercialVehicleAdModel: Model<CommercialVehicleAdDocument>,
  ) {}

  async seedAdsData() {
    console.log('🌱 Starting Ads data seeding...');

    // Sample user IDs (these should match actual users in your system)
    const sampleUserIds = [
      '507f1f77bcf86cd799439021',
      '507f1f77bcf86cd799439022',
      '507f1f77bcf86cd799439023',
      '507f1f77bcf86cd799439024',
      '507f1f77bcf86cd799439025',
    ];

    // Sample vehicle inventory IDs (these should match actual inventory in your system)
    const sampleManufacturerIds = [
      '507f1f77bcf86cd799439031', // Honda
      '507f1f77bcf86cd799439032', // Toyota
      '507f1f77bcf86cd799439033', // Maruti Suzuki
      '507f1f77bcf86cd799439034', // Tata Motors
      '507f1f77bcf86cd799439035', // Hyundai
      '507f1f77bcf86cd799439036', // Bajaj
      '507f1f77bcf86cd799439037', // TVS
    ];

    const sampleModelIds = [
      '507f1f77bcf86cd799439041', // City
      '507f1f77bcf86cd799439042', // Innova
      '507f1f77bcf86cd799439043', // Swift
      '507f1f77bcf86cd799439044', // 407
      '507f1f77bcf86cd799439045', // i20
      '507f1f77bcf86cd799439046', // Pulsar
      '507f1f77bcf86cd799439047', // Apache
    ];

    const sampleVariantIds = [
      '507f1f77bcf86cd799439051', // ZX CVT
      '507f1f77bcf86cd799439052', // GX MT
      '507f1f77bcf86cd799439053', // VXI
      '507f1f77bcf86cd799439054', // 407 Turbo
      '507f1f77bcf86cd799439055', // Asta
      '507f1f77bcf86cd799439056', // 150
      '507f1f77bcf86cd799439057', // RTR 160
    ];

    const sampleTransmissionTypeIds = [
      '507f1f77bcf86cd799439061', // Manual
      '507f1f77bcf86cd799439062', // Automatic
      '507f1f77bcf86cd799439063', // CVT
      '507f1f77bcf86cd799439064', // AMT
    ];

    const sampleFuelTypeIds = [
      '507f1f77bcf86cd799439071', // Petrol
      '507f1f77bcf86cd799439072', // Diesel
      '507f1f77bcf86cd799439073', // CNG
      '507f1f77bcf86cd799439074', // Electric
    ];

    // Clear existing data
    await this.clearExistingData();

    // Seed Property Ads
    await this.seedPropertyAds(sampleUserIds);

    // Seed Vehicle Ads
    await this.seedVehicleAds(
      sampleUserIds,
      sampleManufacturerIds,
      sampleModelIds,
      sampleVariantIds,
      sampleTransmissionTypeIds,
      sampleFuelTypeIds,
    );

    // Seed Commercial Vehicle Ads
    await this.seedCommercialVehicleAds(
      sampleUserIds,
      sampleManufacturerIds,
      sampleModelIds,
      sampleVariantIds,
      sampleTransmissionTypeIds,
      sampleFuelTypeIds,
    );

    // Seed Two Wheeler Ads
    await this.seedTwoWheelerAds(
      sampleUserIds,
      sampleManufacturerIds,
      sampleModelIds,
      sampleVariantIds,
      sampleTransmissionTypeIds,
      sampleFuelTypeIds,
    );

    console.log('✅ Ads data seeding completed successfully!');
  }

  private async clearExistingData() {
    console.log('🧹 Clearing existing ads data...');
    await this.adModel.deleteMany({});
    await this.propertyAdModel.deleteMany({});
    await this.vehicleAdModel.deleteMany({});
    await this.commercialVehicleAdModel.deleteMany({});
    console.log('✅ Existing data cleared');
  }

  private async seedPropertyAds(userIds: string[]) {
    console.log('🏠 Seeding property ads...');

    // Property 1: 2BHK Apartment
    const ad1 = new this.adModel({
      title: 'Beautiful 2BHK Apartment in Prime Location',
      description:
        'Spacious and well-maintained 2BHK apartment located in the heart of the city. This property offers modern amenities, excellent connectivity, and a peaceful neighborhood.',
      price: 8500000,
      images: getRandomImages(),
      location: 'Bandra West, Mumbai, Maharashtra',
      category: AdCategory.PROPERTY,
      postedBy: userIds[0],
      isActive: true,
    });
    const savedAd1 = await ad1.save();

    const propertyAd1 = new this.propertyAdModel({
      ad: savedAd1._id,
      propertyType: PropertyTypeEnum.APARTMENT,
      bedrooms: 2,
      bathrooms: 2,
      areaSqft: 1200,
      floor: 8,
      isFurnished: true,
      hasParking: true,
      hasGarden: false,
      amenities: [
        'Gym',
        'Swimming Pool',
        'Garden',
        'Security',
        'Lift',
        '24/7 Water Supply',
        'Power Backup',
      ],
    });
    await propertyAd1.save();

    // Property 2: 3BHK Villa
    const ad2 = new this.adModel({
      title: 'Luxury 3BHK Villa with Private Garden',
      description:
        'Exclusive 3BHK villa with private garden, modern amenities, and premium finishes. Located in a gated community with 24/7 security.',
      price: 25000000,
      images: getRandomImages(),
      location: 'Whitefield, Bangalore, Karnataka',
      category: AdCategory.PROPERTY,
      postedBy: userIds[1],
      isActive: true,
    });
    const savedAd2 = await ad2.save();

    const propertyAd2 = new this.propertyAdModel({
      ad: savedAd2._id,
      propertyType: PropertyTypeEnum.VILLA,
      bedrooms: 3,
      bathrooms: 3,
      areaSqft: 2800,
      floor: 1,
      isFurnished: false,
      hasParking: true,
      hasGarden: true,
      amenities: [
        'Private Garden',
        'Swimming Pool',
        'Gym',
        'Security',
        'Servant Quarters',
        'Modular Kitchen',
      ],
    });
    await propertyAd2.save();

    // Property 3: Commercial Space
    const ad3 = new this.adModel({
      title: 'Commercial Space in CBD Area',
      description:
        'Prime commercial space in Central Business District. Perfect for retail, office, or restaurant. High footfall area with excellent connectivity.',
      price: 15000000,
      images: getRandomImages(),
      location: 'Connaught Place, Delhi, NCR',
      category: AdCategory.PROPERTY,
      postedBy: userIds[2],
      isActive: true,
    });
    const savedAd3 = await ad3.save();

    const propertyAd3 = new this.propertyAdModel({
      ad: savedAd3._id,
      propertyType: PropertyTypeEnum.COMMERCIAL,
      bedrooms: 0,
      bathrooms: 2,
      areaSqft: 1500,
      floor: 2,
      isFurnished: false,
      hasParking: true,
      hasGarden: false,
      amenities: [
        'Lift',
        'Security',
        'Power Backup',
        'Parking Space',
        'Loading Area',
      ],
    });
    await propertyAd3.save();

    // Property 4: Independent House
    const ad4 = new this.adModel({
      title: 'Independent House with Terrace',
      description:
        'Beautiful independent house with terrace garden. 4BHK with modern amenities, located in a peaceful residential area.',
      price: 18000000,
      images: getRandomImages(),
      location: 'Koramangala, Bangalore, Karnataka',
      category: AdCategory.PROPERTY,
      postedBy: userIds[3],
      isActive: true,
    });
    const savedAd4 = await ad4.save();

    const propertyAd4 = new this.propertyAdModel({
      ad: savedAd4._id,
      propertyType: PropertyTypeEnum.HOUSE,
      bedrooms: 4,
      bathrooms: 4,
      areaSqft: 3200,
      floor: 2,
      isFurnished: true,
      hasParking: true,
      hasGarden: true,
      amenities: [
        'Terrace Garden',
        'Servant Quarters',
        'Modular Kitchen',
        'Security',
        'Parking',
      ],
    });
    await propertyAd4.save();

    // Property 5: Residential Plot
    const ad5 = new this.adModel({
      title: 'Residential Plot in Developing Area',
      description:
        'Prime residential plot in developing area with good appreciation potential. All approvals in place, ready for construction.',
      price: 4500000,
      images: getRandomImages(),
      location: 'Electronic City, Bangalore, Karnataka',
      category: AdCategory.PROPERTY,
      postedBy: userIds[4],
      isActive: true,
    });
    const savedAd5 = await ad5.save();

    const propertyAd5 = new this.propertyAdModel({
      ad: savedAd5._id,
      propertyType: PropertyTypeEnum.PLOT,
      bedrooms: 0,
      bathrooms: 0,
      areaSqft: 2400,
      floor: 0,
      isFurnished: false,
      hasParking: false,
      hasGarden: false,
      amenities: [],
    });
    await propertyAd5.save();

    console.log('✅ Seeded 5 property ads');
  }

  private async seedVehicleAds(
    userIds: string[],
    manufacturerIds: string[],
    modelIds: string[],
    variantIds: string[],
    transmissionTypeIds: string[],
    fuelTypeIds: string[],
  ) {
    console.log('🚗 Seeding vehicle ads...');

    // Vehicle 1: Honda City
    const ad6 = new this.adModel({
      title: 'Honda City 2020 Model - Single Owner',
      description:
        'Well-maintained Honda City in excellent condition. Single owner, full service history, no accidents. Perfect for daily commute.',
      price: 850000,
      images: getRandomImages(),
      location: 'Dwarka, Delhi, NCR',
      category: AdCategory.PRIVATE_VEHICLE,
      postedBy: userIds[0],
      isActive: true,
    });
    const savedAd6 = await ad6.save();

    const vehicleAd1 = new this.vehicleAdModel({
      ad: savedAd6._id,
      vehicleType: VehicleTypeEnum.FOUR_WHEELER,
      manufacturerId: manufacturerIds[0], // Honda
      modelId: modelIds[0], // City
      variantId: variantIds[0], // ZX CVT
      year: 2020,
      mileage: 25000,
      transmissionTypeId: transmissionTypeIds[2], // CVT
      fuelTypeId: fuelTypeIds[0], // Petrol
      color: 'White',
      isFirstOwner: true,
      hasInsurance: true,
      hasRcBook: true,
      additionalFeatures: [
        'Sunroof',
        'Leather Seats',
        'Navigation System',
        'Reverse Camera',
        'Bluetooth Connectivity',
        'Climate Control',
      ],
    });
    await vehicleAd1.save();

    // Vehicle 2: Toyota Innova
    const ad7 = new this.adModel({
      title: 'Toyota Innova Crysta 2019 - Well Maintained',
      description:
        'Toyota Innova Crysta in excellent condition. Perfect for family use. All service records available, single owner.',
      price: 1200000,
      images: getRandomImages(),
      location: 'Andheri West, Mumbai, Maharashtra',
      category: AdCategory.PRIVATE_VEHICLE,
      postedBy: userIds[1],
      isActive: true,
    });
    const savedAd7 = await ad7.save();

    const vehicleAd2 = new this.vehicleAdModel({
      ad: savedAd7._id,
      vehicleType: VehicleTypeEnum.FOUR_WHEELER,
      manufacturerId: manufacturerIds[1], // Toyota
      modelId: modelIds[1], // Innova
      variantId: variantIds[1], // GX MT
      year: 2019,
      mileage: 45000,
      transmissionTypeId: transmissionTypeIds[0], // Manual
      fuelTypeId: fuelTypeIds[1], // Diesel
      color: 'Silver',
      isFirstOwner: true,
      hasInsurance: true,
      hasRcBook: true,
      additionalFeatures: [
        'Climate Control',
        'Touch Screen',
        'Reverse Camera',
        'Alloy Wheels',
        'Fog Lamps',
      ],
    });
    await vehicleAd2.save();

    // Vehicle 3: Maruti Swift
    const ad8 = new this.adModel({
      title: 'Maruti Swift 2021 - Low Mileage',
      description:
        'Maruti Swift in pristine condition. Low mileage, excellent fuel efficiency. Perfect for city driving.',
      price: 650000,
      images: getRandomImages(),
      location: 'Koramangala, Bangalore, Karnataka',
      category: AdCategory.PRIVATE_VEHICLE,
      postedBy: userIds[2],
      isActive: true,
    });
    const savedAd8 = await ad8.save();

    const vehicleAd3 = new this.vehicleAdModel({
      ad: savedAd8._id,
      vehicleType: VehicleTypeEnum.FOUR_WHEELER,
      manufacturerId: manufacturerIds[2], // Maruti Suzuki
      modelId: modelIds[2], // Swift
      variantId: variantIds[2], // VXI
      year: 2021,
      mileage: 18000,
      transmissionTypeId: transmissionTypeIds[0], // Manual
      fuelTypeId: fuelTypeIds[0], // Petrol
      color: 'Red',
      isFirstOwner: true,
      hasInsurance: true,
      hasRcBook: true,
      additionalFeatures: [
        'Power Windows',
        'Central Locking',
        'Music System',
        'Steering Mounted Controls',
      ],
    });
    await vehicleAd3.save();

    // Vehicle 4: Hyundai i20
    const ad9 = new this.adModel({
      title: 'Hyundai i20 2022 - Top Model',
      description:
        'Hyundai i20 Asta in excellent condition. Top model with all features. Single owner, full service history.',
      price: 950000,
      images: getRandomImages(),
      location: 'Pune, Maharashtra',
      category: AdCategory.PRIVATE_VEHICLE,
      postedBy: userIds[3],
      isActive: true,
    });
    const savedAd9 = await ad9.save();

    const vehicleAd4 = new this.vehicleAdModel({
      ad: savedAd9._id,
      vehicleType: VehicleTypeEnum.FOUR_WHEELER,
      manufacturerId: manufacturerIds[4], // Hyundai
      modelId: modelIds[4], // i20
      variantId: variantIds[4], // Asta
      year: 2022,
      mileage: 12000,
      transmissionTypeId: transmissionTypeIds[1], // Automatic
      fuelTypeId: fuelTypeIds[0], // Petrol
      color: 'Blue',
      isFirstOwner: true,
      hasInsurance: true,
      hasRcBook: true,
      additionalFeatures: [
        'Sunroof',
        'Wireless Charging',
        'Ventilated Seats',
        'Connected Car Tech',
        'LED Headlamps',
      ],
    });
    await vehicleAd4.save();

    console.log('✅ Seeded 4 vehicle ads');
  }

  private async seedCommercialVehicleAds(
    userIds: string[],
    manufacturerIds: string[],
    modelIds: string[],
    variantIds: string[],
    transmissionTypeIds: string[],
    fuelTypeIds: string[],
  ) {
    console.log('🚛 Seeding commercial vehicle ads...');

    // Commercial Vehicle 1: Tata 407 Truck
    const ad10 = new this.adModel({
      title: 'Tata 407 Truck - Excellent Condition',
      description:
        'Heavy duty Tata 407 truck in excellent condition. Perfect for logistics and transportation business. Well-maintained with all necessary permits.',
      price: 1800000,
      images: getRandomImages(),
      location: 'Pune, Maharashtra',
      category: AdCategory.COMMERCIAL_VEHICLE,
      postedBy: userIds[0],
      isActive: true,
    });
    const savedAd10 = await ad10.save();

    const commercialVehicleAd1 = new this.commercialVehicleAdModel({
      ad: savedAd10._id,
      vehicleType: CommercialVehicleTypeEnum.TRUCK,
      bodyType: BodyTypeEnum.FLATBED,
      manufacturerId: manufacturerIds[3], // Tata Motors
      modelId: modelIds[3], // 407
      variantId: variantIds[3], // 407 Turbo
      year: 2019,
      mileage: 75000,
      payloadCapacity: 5000,
      payloadUnit: 'kg',
      axleCount: 2,
      transmissionTypeId: transmissionTypeIds[0], // Manual
      fuelTypeId: fuelTypeIds[1], // Diesel
      color: 'Blue',
      hasInsurance: true,
      hasFitness: true,
      hasPermit: true,
      additionalFeatures: [
        'GPS Tracking',
        'Climate Control',
        'Safety Features',
        'Anti-lock Braking System',
        'Load Sensing Valve',
      ],
      seatingCapacity: 3,
    });
    await commercialVehicleAd1.save();

    // Commercial Vehicle 2: Mahindra Bolero Pickup
    const ad11 = new this.adModel({
      title: 'Mahindra Bolero Pickup - Business Ready',
      description:
        'Mahindra Bolero pickup in good condition. Perfect for small business transportation needs. Economical and reliable.',
      price: 450000,
      images: getRandomImages(),
      location: 'Chennai, Tamil Nadu',
      category: AdCategory.COMMERCIAL_VEHICLE,
      postedBy: userIds[1],
      isActive: true,
    });
    const savedAd11 = await ad11.save();

    const commercialVehicleAd2 = new this.commercialVehicleAdModel({
      ad: savedAd11._id,
      vehicleType: CommercialVehicleTypeEnum.VAN,
      bodyType: BodyTypeEnum.PICKUP,
      manufacturerId: manufacturerIds[3], // Tata Motors (using same for Mahindra)
      modelId: modelIds[2], // Swift (using as Bolero)
      variantId: variantIds[2], // VXI
      year: 2018,
      mileage: 95000,
      payloadCapacity: 1500,
      payloadUnit: 'kg',
      axleCount: 2,
      transmissionTypeId: transmissionTypeIds[0], // Manual
      fuelTypeId: fuelTypeIds[1], // Diesel
      color: 'White',
      hasInsurance: true,
      hasFitness: true,
      hasPermit: true,
      additionalFeatures: ['Power Steering', 'Music System', 'Tachometer'],
      seatingCapacity: 2,
    });
    await commercialVehicleAd2.save();

    // Commercial Vehicle 3: Eicher Pro 1049
    const ad12 = new this.adModel({
      title: 'Eicher Pro 1049 - Heavy Duty Truck',
      description:
        'Eicher Pro 1049 heavy duty truck. Excellent for long distance transportation. Well-maintained with all documents.',
      price: 3500000,
      images: getRandomImages(),
      location: 'Ahmedabad, Gujarat',
      category: AdCategory.COMMERCIAL_VEHICLE,
      postedBy: userIds[2],
      isActive: true,
    });
    const savedAd12 = await ad12.save();

    const commercialVehicleAd3 = new this.commercialVehicleAdModel({
      ad: savedAd12._id,
      vehicleType: CommercialVehicleTypeEnum.TRUCK,
      bodyType: BodyTypeEnum.CONTAINER,
      manufacturerId: manufacturerIds[4], // Hyundai (using for Eicher)
      modelId: modelIds[4], // i20 (using as Pro 1049)
      variantId: variantIds[4], // Asta
      year: 2020,
      mileage: 120000,
      payloadCapacity: 9000,
      payloadUnit: 'kg',
      axleCount: 3,
      transmissionTypeId: transmissionTypeIds[0], // Manual
      fuelTypeId: fuelTypeIds[1], // Diesel
      color: 'Red',
      hasInsurance: true,
      hasFitness: true,
      hasPermit: true,
      additionalFeatures: [
        'Sleeping Berth',
        'Climate Control',
        'GPS Navigation',
        'Fleet Management System',
      ],
      seatingCapacity: 2,
    });
    await commercialVehicleAd3.save();

    console.log('✅ Seeded 3 commercial vehicle ads');
  }

  private async seedTwoWheelerAds(
    userIds: string[],
    manufacturerIds: string[],
    modelIds: string[],
    variantIds: string[],
    transmissionTypeIds: string[],
    fuelTypeIds: string[],
  ) {
    console.log('🛵 Seeding two-wheeler ads...');

    // Two Wheeler 1: Honda Activa
    const ad13 = new this.adModel({
      title: 'Honda Activa 6G - 2021 Model',
      description:
        'Honda Activa 6G in pristine condition. Single owner, low mileage, excellent fuel efficiency. Perfect for daily commute.',
      price: 65000,
      images: getRandomImages(),
      location: 'Koramangala, Bangalore, Karnataka',
      category: AdCategory.TWO_WHEELER,
      postedBy: userIds[0],
      isActive: true,
    });
    const savedAd13 = await ad13.save();

    const twoWheelerAd1 = new this.vehicleAdModel({
      ad: savedAd13._id,
      vehicleType: VehicleTypeEnum.TWO_WHEELER,
      manufacturerId: manufacturerIds[0], // Honda
      modelId: modelIds[0], // City (using as Activa)
      variantId: variantIds[0], // ZX CVT (using as 6G)
      year: 2021,
      mileage: 15000,
      transmissionTypeId: transmissionTypeIds[2], // CVT
      fuelTypeId: fuelTypeIds[0], // Petrol
      color: 'Red',
      isFirstOwner: true,
      hasInsurance: true,
      hasRcBook: true,
      additionalFeatures: [
        'Digital Console',
        'LED Headlight',
        'Mobile Charging Port',
        'External Fuel Filler',
        'Combi Brake System',
      ],
    });
    await twoWheelerAd1.save();

    // Two Wheeler 2: Bajaj Pulsar
    const ad14 = new this.adModel({
      title: 'Bajaj Pulsar 150 - Sporty Ride',
      description:
        'Bajaj Pulsar 150 in excellent condition. Sporty bike with good performance. Well-maintained, single owner.',
      price: 85000,
      images: getRandomImages(),
      location: 'Dwarka, Delhi, NCR',
      category: AdCategory.TWO_WHEELER,
      postedBy: userIds[1],
      isActive: true,
    });
    const savedAd14 = await ad14.save();

    const twoWheelerAd2 = new this.vehicleAdModel({
      ad: savedAd14._id,
      vehicleType: VehicleTypeEnum.TWO_WHEELER,
      manufacturerId: manufacturerIds[5], // Bajaj
      modelId: modelIds[5], // Pulsar
      variantId: variantIds[5], // 150
      year: 2020,
      mileage: 25000,
      transmissionTypeId: transmissionTypeIds[0], // Manual
      fuelTypeId: fuelTypeIds[0], // Petrol
      color: 'Black',
      isFirstOwner: true,
      hasInsurance: true,
      hasRcBook: true,
      additionalFeatures: [
        'Digital Speedometer',
        'LED Tail Lamp',
        'Tubeless Tyres',
        'Electric Start',
        'Kick Start',
      ],
    });
    await twoWheelerAd2.save();

    // Two Wheeler 3: TVS Apache
    const ad15 = new this.adModel({
      title: 'TVS Apache RTR 160 - Racing Edition',
      description:
        'TVS Apache RTR 160 racing edition. High performance bike with racing features. Excellent condition, low mileage.',
      price: 95000,
      images: getRandomImages(),
      location: 'Andheri West, Mumbai, Maharashtra',
      category: AdCategory.TWO_WHEELER,
      postedBy: userIds[2],
      isActive: true,
    });
    const savedAd15 = await ad15.save();

    const twoWheelerAd3 = new this.vehicleAdModel({
      ad: savedAd15._id,
      vehicleType: VehicleTypeEnum.TWO_WHEELER,
      manufacturerId: manufacturerIds[6], // TVS
      modelId: modelIds[6], // Apache
      variantId: variantIds[6], // RTR 160
      year: 2021,
      mileage: 12000,
      transmissionTypeId: transmissionTypeIds[0], // Manual
      fuelTypeId: fuelTypeIds[0], // Petrol
      color: 'Blue',
      isFirstOwner: true,
      hasInsurance: true,
      hasRcBook: true,
      additionalFeatures: [
        'Racing Graphics',
        'Performance Exhaust',
        'Racing Seat',
        'LED Indicators',
        'ABS',
      ],
    });
    await twoWheelerAd3.save();

    // Two Wheeler 4: Hero Splendor
    const ad16 = new this.adModel({
      title: 'Hero Splendor Plus - Economical Ride',
      description:
        'Hero Splendor Plus in good condition. Economical and reliable bike. Perfect for daily commute and long rides.',
      price: 45000,
      images: getRandomImages(),
      location: 'Pune, Maharashtra',
      category: AdCategory.TWO_WHEELER,
      postedBy: userIds[3],
      isActive: true,
    });
    const savedAd16 = await ad16.save();

    const twoWheelerAd4 = new this.vehicleAdModel({
      ad: savedAd16._id,
      vehicleType: VehicleTypeEnum.TWO_WHEELER,
      manufacturerId: manufacturerIds[0], // Honda (using for Hero)
      modelId: modelIds[1], // Innova (using as Splendor)
      variantId: variantIds[1], // GX MT (using as Plus)
      year: 2019,
      mileage: 35000,
      transmissionTypeId: transmissionTypeIds[0], // Manual
      fuelTypeId: fuelTypeIds[0], // Petrol
      color: 'Silver',
      isFirstOwner: true,
      hasInsurance: true,
      hasRcBook: true,
      additionalFeatures: [
        'Economy Mode',
        'Side Stand Indicator',
        'Pass Light',
        'Tubeless Tyres',
      ],
    });
    await twoWheelerAd4.save();

    console.log('✅ Seeded 4 two-wheeler ads');
  }
}
