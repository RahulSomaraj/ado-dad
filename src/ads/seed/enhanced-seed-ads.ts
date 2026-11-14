import { Injectable } from '@nestjs/common';

// Specific image collections for each vehicle type
const VEHICLE_IMAGES = {
  'Honda City': [
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/honda_city_front.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/honda_city_side.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/honda_city_rear.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/honda_city_interior.jpg',
  ],
  'Toyota Innova': [
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/innova_front.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/innova_side.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/innova_rear.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/innova_interior.jpg',
  ],
  'Maruti Swift': [
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/swift_front.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/swift_side.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/swift_rear.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/swift_interior.jpg',
  ],
  'Hyundai i20': [
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/i20_front.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/i20_side.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/i20_rear.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/i20_interior.jpg',
  ],
  'Tata Nexon': [
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/nexon_front.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/nexon_side.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/nexon_rear.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/nexon_interior.jpg',
  ],
};

// Premium car images
const PREMIUM_CAR_IMAGES = {
  'BMW 3 Series': [
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/bmw3_front.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/bmw3_side.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/bmw3_rear.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/bmw3_interior.jpg',
  ],
  'Mercedes C-Class': [
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/mercedes_c_front.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/mercedes_c_side.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/mercedes_c_rear.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/mercedes_c_interior.jpg',
  ],
  'Audi A4': [
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/audi_a4_front.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/audi_a4_side.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/audi_a4_rear.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/audi_a4_interior.jpg',
  ],
};

// Bike images
const BIKE_IMAGES = {
  'Honda Splendor': [
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/splendor_front.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/splendor_side.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/splendor_rear.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/splendor_dashboard.jpg',
  ],
  'Bajaj Pulsar': [
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/pulsar_front.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/pulsar_side.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/pulsar_rear.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/pulsar_dashboard.jpg',
  ],
  'TVS Apache': [
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/apache_front.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/apache_side.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/apache_rear.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/apache_dashboard.jpg',
  ],
};

// Property images
const PROPERTY_IMAGES = [
  'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/property_living_room.jpg',
  'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/property_kitchen.jpg',
  'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/property_bedroom.jpg',
  'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/property_bathroom.jpg',
  'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/property_balcony.jpg',
  'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/property_exterior.jpg',
];

// Premium vehicle images (SUVs, Luxury vehicles)
const PREMIUM_VEHICLE_IMAGES = {
  'Range Rover': [
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/range_rover_front.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/range_rover_side.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/range_rover_rear.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/range_rover_interior.jpg',
  ],
  'BMW X5': [
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/bmw_x5_front.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/bmw_x5_side.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/bmw_x5_rear.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/bmw_x5_interior.jpg',
  ],
  'Mercedes GLE': [
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/mercedes_gle_front.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/mercedes_gle_side.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/mercedes_gle_rear.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/mercedes_gle_interior.jpg',
  ],
  'Audi Q7': [
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/audi_q7_front.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/audi_q7_side.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/audi_q7_rear.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/audi_q7_interior.jpg',
  ],
  'Porsche Cayenne': [
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/porsche_cayenne_front.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/porsche_cayenne_side.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/porsche_cayenne_rear.jpg',
    'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads/porsche_cayenne_interior.jpg',
  ],
};
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

// Helper functions
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

@Injectable()
export class EnhancedAdsSeedService {
  constructor(
    @InjectModel(Ad.name) private readonly adModel: Model<AdDocument>,
    @InjectModel(PropertyAd.name)
    private readonly propertyAdModel: Model<PropertyAdDocument>,
    @InjectModel(VehicleAd.name)
    private readonly vehicleAdModel: Model<VehicleAdDocument>,
    @InjectModel(CommercialVehicleAd.name)
    private readonly commercialVehicleAdModel: Model<CommercialVehicleAdDocument>,
  ) {}

  async seedEnhancedAdsData() {
    console.log('🌱 Starting Enhanced Ads data seeding...');

    const expertUserIds = [
      '507f1f77bcf86cd799439021',
      '507f1f77bcf86cd799439022',
      '507f1f77bcf86cd799439023',
    ];

    const manufacturerIds = [
      '507f1f77bcf86cd799439031',
      '507f1f77bcf86cd799439032',
      '507f1f77bcf86cd799439033',
    ];

    const modelIds = [
      '507f1f77bcf86cd799439041',
      '507f1f77bcf86cd799439042',
      '507f1f77bcf86cd799439043',
    ];

    try {
      await this.seedPropertyAds(expertUserIds);
      await this.seedBikeAds(expertUserIds, manufacturerIds, modelIds);
      await this.seedCarAds(expertUserIds, manufacturerIds, modelIds);
      await this.seedPremiumCarAds(expertUserIds, manufacturerIds, modelIds);
      await this.seedPremiumVehicleAds(expertUserIds, manufacturerIds, modelIds);

      console.log('🎉 Enhanced Ads data seeding completed!');
      console.log('📊 Summary: 50 advertisements with specific images');
    } catch (error) {
      console.error('❌ Error during enhanced seeding:', error);
      throw error;
    }
  }

  async seedPropertyAds(expertUserIds: string[]) {
    console.log('🏠 Seeding Property Ads...');
    
    const propertyData = [
      {
        title: 'Luxury 3BHK Apartment in Bandra West',
        description: 'Premium 3BHK apartment with modern amenities.',
        price: 25000000,
        location: 'Bandra West, Mumbai',
        propertyType: PropertyTypeEnum.APARTMENT,
        area: 1800,
        bedrooms: 3,
        bathrooms: 3,
      },
      {
        title: 'Spacious 2BHK Flat in Andheri East',
        description: 'Well-maintained 2BHK flat in prime location.',
        price: 12000000,
        location: 'Andheri East, Mumbai',
        propertyType: PropertyTypeEnum.APARTMENT,
        area: 1200,
        bedrooms: 2,
        bathrooms: 2,
      },
      {
        title: 'Premium 4BHK Villa in Powai',
        description: 'Luxury villa with private garden and swimming pool.',
        price: 45000000,
        location: 'Powai, Mumbai',
        propertyType: PropertyTypeEnum.VILLA,
        area: 3500,
        bedrooms: 4,
        bathrooms: 4,
      },
      {
        title: 'Modern 1BHK Studio in Worli',
        description: 'Contemporary studio apartment with city views.',
        price: 8500000,
        location: 'Worli, Mumbai',
        propertyType: PropertyTypeEnum.APARTMENT,
        area: 800,
        bedrooms: 1,
        bathrooms: 1,
      },
      {
        title: 'Luxury Penthouse in Juhu',
        description: 'Exclusive penthouse with panoramic sea views.',
        price: 75000000,
        location: 'Juhu, Mumbai',
        propertyType: PropertyTypeEnum.VILLA,
        area: 5000,
        bedrooms: 5,
        bathrooms: 5,
      },
      {
        title: 'Family Home in Thane West',
        description: 'Spacious family home with garden and parking.',
        price: 18000000,
        location: 'Thane West, Mumbai',
        propertyType: PropertyTypeEnum.HOUSE,
        area: 2500,
        bedrooms: 3,
        bathrooms: 3,
      },
      {
        title: 'Premium 2BHK in Dadar West',
        description: 'Heritage area property with modern amenities.',
        price: 15000000,
        location: 'Dadar West, Mumbai',
        propertyType: PropertyTypeEnum.APARTMENT,
        area: 1400,
        bedrooms: 2,
        bathrooms: 2,
      },
      {
        title: 'Luxury 3BHK in Vashi',
        description: 'Premium apartment in Navi Mumbai with all facilities.',
        price: 22000000,
        location: 'Vashi, Navi Mumbai',
        propertyType: PropertyTypeEnum.APARTMENT,
        area: 2000,
        bedrooms: 3,
        bathrooms: 3,
      },
      {
        title: 'Modern 1BHK in Chembur',
        description: 'Well-designed 1BHK with modern interiors.',
        price: 9500000,
        location: 'Chembur, Mumbai',
        propertyType: PropertyTypeEnum.APARTMENT,
        area: 900,
        bedrooms: 1,
        bathrooms: 1,
      },
      {
        title: 'Premium 4BHK in Bandra East',
        description: 'Luxury apartment with premium finishes and amenities.',
        price: 35000000,
        location: 'Bandra East, Mumbai',
        propertyType: PropertyTypeEnum.APARTMENT,
        area: 2800,
        bedrooms: 4,
        bathrooms: 4,
      },
    ];

    for (let i = 0; i < propertyData.length; i++) {
      const data = propertyData[i];
      const images = PROPERTY_IMAGES.slice(0, 4);
      
      // Create main Ad document first
      const ad = new this.adModel({
        title: data.title,
        description: data.description,
        price: data.price,
        images: images,
        location: data.location,
        category: AdCategory.PROPERTY,
        postedBy: getRandomElement(expertUserIds),
        isActive: true,
      });
      const savedAd = await ad.save();

      // Create PropertyAd with reference to main Ad
      const propertyAd = new this.propertyAdModel({
        ad: savedAd._id,
        propertyType: data.propertyType,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        areaSqft: data.area,
        floor: getRandomNumber(1, 20),
        isFurnished: Math.random() > 0.5,
        hasParking: true,
        hasGarden: Math.random() > 0.3,
        amenities: ['Gym', 'Swimming Pool', 'Security', '24/7 Water Supply'],
      });

      await propertyAd.save();
      console.log(`   ✅ Created property ad: ${data.title}`);
    }
  }

  async seedBikeAds(expertUserIds: string[], manufacturerIds: string[], modelIds: string[]) {
    console.log('🏍️ Seeding Bike Ads...');
    
    const bikeData = [
      {
        title: 'Honda Splendor Plus - Well Maintained',
        description: 'Single owner Honda Splendor Plus in excellent condition.',
        price: 45000,
        location: 'Mumbai, Maharashtra',
        vehicleType: VehicleTypeEnum.TWO_WHEELER,
        manufacturerId: manufacturerIds[0],
        modelId: modelIds[0],
        year: 2018,
        mileage: 25000,
        color: 'Black',
        images: BIKE_IMAGES['Honda Splendor'],
      },
      {
        title: 'Bajaj Pulsar 150 - Sporty Ride',
        description: 'Powerful Bajaj Pulsar 150 with sporty design.',
        price: 65000,
        location: 'Pune, Maharashtra',
        vehicleType: VehicleTypeEnum.TWO_WHEELER,
        manufacturerId: manufacturerIds[1],
        modelId: modelIds[1],
        year: 2019,
        mileage: 18000,
        color: 'Red',
        images: BIKE_IMAGES['Bajaj Pulsar'],
      },
      {
        title: 'TVS Apache RTR 160 - Performance Bike',
        description: 'High-performance TVS Apache RTR 160 with racing DNA.',
        price: 75000,
        location: 'Delhi, NCR',
        vehicleType: VehicleTypeEnum.TWO_WHEELER,
        manufacturerId: manufacturerIds[2],
        modelId: modelIds[2],
        year: 2020,
        mileage: 15000,
        color: 'Blue',
        images: BIKE_IMAGES['TVS Apache'],
      },
      {
        title: 'Honda Activa 6G - Family Scooter',
        description: 'Reliable Honda Activa 6G perfect for daily commute.',
        price: 55000,
        location: 'Bangalore, Karnataka',
        vehicleType: VehicleTypeEnum.TWO_WHEELER,
        manufacturerId: manufacturerIds[0],
        modelId: modelIds[0],
        year: 2019,
        mileage: 20000,
        color: 'White',
        images: BIKE_IMAGES['Honda Splendor'],
      },
      {
        title: 'Yamaha R15 V3 - Sports Bike',
        description: 'Premium Yamaha R15 V3 with track-ready performance.',
        price: 120000,
        location: 'Chennai, Tamil Nadu',
        vehicleType: VehicleTypeEnum.TWO_WHEELER,
        manufacturerId: manufacturerIds[1],
        modelId: modelIds[1],
        year: 2021,
        mileage: 8000,
        color: 'Racing Blue',
        images: BIKE_IMAGES['Bajaj Pulsar'],
      },
      {
        title: 'Royal Enfield Classic 350 - Heritage',
        description: 'Iconic Royal Enfield Classic 350 with vintage charm.',
        price: 180000,
        location: 'Hyderabad, Telangana',
        vehicleType: VehicleTypeEnum.TWO_WHEELER,
        manufacturerId: manufacturerIds[2],
        modelId: modelIds[2],
        year: 2020,
        mileage: 12000,
        color: 'Desert Storm',
        images: BIKE_IMAGES['TVS Apache'],
      },
      {
        title: 'KTM Duke 200 - Street Fighter',
        description: 'Aggressive KTM Duke 200 with street fighter styling.',
        price: 140000,
        location: 'Ahmedabad, Gujarat',
        vehicleType: VehicleTypeEnum.TWO_WHEELER,
        manufacturerId: manufacturerIds[0],
        modelId: modelIds[0],
        year: 2019,
        mileage: 16000,
        color: 'Orange',
        images: BIKE_IMAGES['Honda Splendor'],
      },
      {
        title: 'Suzuki Gixxer SF - Sport Touring',
        description: 'Suzuki Gixxer SF with sport touring capabilities.',
        price: 95000,
        location: 'Kolkata, West Bengal',
        vehicleType: VehicleTypeEnum.TWO_WHEELER,
        manufacturerId: manufacturerIds[1],
        modelId: modelIds[1],
        year: 2020,
        mileage: 14000,
        color: 'Metallic Black',
        images: BIKE_IMAGES['Bajaj Pulsar'],
      },
      {
        title: 'Hero Xtreme 160R - Street Smart',
        description: 'Hero Xtreme 160R with modern street smart design.',
        price: 85000,
        location: 'Lucknow, Uttar Pradesh',
        vehicleType: VehicleTypeEnum.TWO_WHEELER,
        manufacturerId: manufacturerIds[2],
        modelId: modelIds[2],
        year: 2021,
        mileage: 10000,
        color: 'Red',
        images: BIKE_IMAGES['TVS Apache'],
      },
      {
        title: 'Honda CB Shine - Commuter Choice',
        description: 'Reliable Honda CB Shine perfect for daily commuting.',
        price: 60000,
        location: 'Jaipur, Rajasthan',
        vehicleType: VehicleTypeEnum.TWO_WHEELER,
        manufacturerId: manufacturerIds[0],
        modelId: modelIds[0],
        year: 2018,
        mileage: 22000,
        color: 'Silver',
        images: BIKE_IMAGES['Honda Splendor'],
      },
    ];

    for (let i = 0; i < bikeData.length; i++) {
      const data = bikeData[i];
      
      // Create main Ad document first
      const ad = new this.adModel({
        title: data.title,
        description: data.description,
        price: data.price,
        images: data.images,
        location: data.location,
        category: AdCategory.PRIVATE_VEHICLE,
        postedBy: getRandomElement(expertUserIds),
        isActive: true,
      });
      const savedAd = await ad.save();

      // Create VehicleAd with reference to main Ad
      const vehicleAd = new this.vehicleAdModel({
        ad: savedAd._id,
        vehicleType: data.vehicleType,
        manufacturerId: data.manufacturerId,
        modelId: data.modelId,
        year: data.year,
        mileage: data.mileage,
        color: data.color,
        isFirstOwner: Math.random() > 0.3,
        hasInsurance: true,
        hasRcBook: true,
        additionalFeatures: ['LED Headlamps', 'Digital Console', 'ABS'],
        // Add required fields with dummy IDs
        transmissionTypeId: data.manufacturerId, // Using manufacturerId as dummy
        fuelTypeId: data.modelId, // Using modelId as dummy
      });

      await vehicleAd.save();
      console.log(`   ✅ Created bike ad: ${data.title}`);
    }
  }

  async seedCarAds(expertUserIds: string[], manufacturerIds: string[], modelIds: string[]) {
    console.log('🚗 Seeding Car Ads...');
    
    const carData = [
      {
        title: 'Honda City VX - Premium Sedan',
        description: 'Well-maintained Honda City VX with premium features.',
        price: 850000,
        location: 'Mumbai, Maharashtra',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[0],
        modelId: modelIds[0],
        year: 2019,
        mileage: 35000,
        color: 'White',
        images: VEHICLE_IMAGES['Honda City'],
      },
      {
        title: 'Toyota Innova Crysta - Family SUV',
        description: 'Spacious Toyota Innova Crysta perfect for family trips.',
        price: 1200000,
        location: 'Pune, Maharashtra',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[1],
        modelId: modelIds[1],
        year: 2018,
        mileage: 45000,
        color: 'Silver',
        images: VEHICLE_IMAGES['Toyota Innova'],
      },
      {
        title: 'Maruti Swift VXI - Hatchback',
        description: 'Popular Maruti Swift VXI with great fuel efficiency.',
        price: 550000,
        location: 'Delhi, NCR',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[2],
        modelId: modelIds[2],
        year: 2020,
        mileage: 25000,
        color: 'Pearl White',
        images: VEHICLE_IMAGES['Maruti Swift'],
      },
      {
        title: 'Hyundai i20 Asta - Premium Hatch',
        description: 'Premium Hyundai i20 Asta with modern features.',
        price: 750000,
        location: 'Bangalore, Karnataka',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[0],
        modelId: modelIds[0],
        year: 2019,
        mileage: 30000,
        color: 'Phantom Black',
        images: VEHICLE_IMAGES['Hyundai i20'],
      },
      {
        title: 'Tata Nexon XZ+ - Electric SUV',
        description: 'Modern Tata Nexon XZ+ electric vehicle with long range.',
        price: 950000,
        location: 'Chennai, Tamil Nadu',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[1],
        modelId: modelIds[1],
        year: 2021,
        mileage: 15000,
        color: 'Teal Blue',
        images: VEHICLE_IMAGES['Tata Nexon'],
      },
      {
        title: 'Mahindra XUV500 W8 - SUV',
        description: 'Powerful Mahindra XUV500 W8 with premium features.',
        price: 1100000,
        location: 'Hyderabad, Telangana',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[2],
        modelId: modelIds[2],
        year: 2018,
        mileage: 40000,
        color: 'Moon Dust Silver',
        images: VEHICLE_IMAGES['Honda City'],
      },
      {
        title: 'Ford EcoSport Titanium - Compact SUV',
        description: 'Ford EcoSport Titanium with sporty design and features.',
        price: 800000,
        location: 'Ahmedabad, Gujarat',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[0],
        modelId: modelIds[0],
        year: 2019,
        mileage: 28000,
        color: 'White',
        images: VEHICLE_IMAGES['Toyota Innova'],
      },
      {
        title: 'Renault Duster RXZ - Adventure SUV',
        description: 'Renault Duster RXZ perfect for adventure and daily use.',
        price: 700000,
        location: 'Kolkata, West Bengal',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[1],
        modelId: modelIds[1],
        year: 2017,
        mileage: 50000,
        color: 'Outdoor Beige',
        images: VEHICLE_IMAGES['Maruti Swift'],
      },
      {
        title: 'Nissan Kicks XV - Smart SUV',
        description: 'Nissan Kicks XV with smart connectivity features.',
        price: 900000,
        location: 'Lucknow, Uttar Pradesh',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[2],
        modelId: modelIds[2],
        year: 2020,
        mileage: 20000,
        color: 'Aurora Green',
        images: VEHICLE_IMAGES['Hyundai i20'],
      },
      {
        title: 'MG Hector Plus - 6-Seater SUV',
        description: 'Spacious MG Hector Plus with 6-seater configuration.',
        price: 1300000,
        location: 'Jaipur, Rajasthan',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[0],
        modelId: modelIds[0],
        year: 2021,
        mileage: 12000,
        color: 'Glaze Red',
        images: VEHICLE_IMAGES['Tata Nexon'],
      },
    ];

    for (let i = 0; i < carData.length; i++) {
      const data = carData[i];
      
      // Create main Ad document first
      const ad = new this.adModel({
        title: data.title,
        description: data.description,
        price: data.price,
        images: data.images,
        location: data.location,
        category: AdCategory.PRIVATE_VEHICLE,
        postedBy: getRandomElement(expertUserIds),
        isActive: true,
      });
      const savedAd = await ad.save();

      // Create VehicleAd with reference to main Ad
      const vehicleAd = new this.vehicleAdModel({
        ad: savedAd._id,
        vehicleType: data.vehicleType,
        manufacturerId: data.manufacturerId,
        modelId: data.modelId,
        year: data.year,
        mileage: data.mileage,
        color: data.color,
        isFirstOwner: Math.random() > 0.4,
        hasInsurance: true,
        hasRcBook: true,
        additionalFeatures: ['ABS', 'Airbags', 'Power Steering', 'Climate Control'],
        // Add required fields with dummy IDs
        transmissionTypeId: data.manufacturerId, // Using manufacturerId as dummy
        fuelTypeId: data.modelId, // Using modelId as dummy
      });

      await vehicleAd.save();
      console.log(`   ✅ Created car ad: ${data.title}`);
    }
  }

  async seedPremiumCarAds(expertUserIds: string[], manufacturerIds: string[], modelIds: string[]) {
    console.log('🏎️ Seeding Premium Car Ads...');
    
    const premiumCarData = [
      {
        title: 'BMW 3 Series 320d - Luxury Sedan',
        description: 'Premium BMW 3 Series 320d with luxury features.',
        price: 3500000,
        location: 'Mumbai, Maharashtra',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[0],
        modelId: modelIds[0],
        year: 2020,
        mileage: 25000,
        color: 'Alpine White',
        images: PREMIUM_CAR_IMAGES['BMW 3 Series'],
      },
      {
        title: 'Mercedes C-Class C200 - Executive Sedan',
        description: 'Executive Mercedes C-Class C200 with premium interiors.',
        price: 4200000,
        location: 'Delhi, NCR',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[1],
        modelId: modelIds[1],
        year: 2019,
        mileage: 30000,
        color: 'Obsidian Black',
        images: PREMIUM_CAR_IMAGES['Mercedes C-Class'],
      },
      {
        title: 'Audi A4 35 TDI - Premium Sedan',
        description: 'Sophisticated Audi A4 35 TDI with quattro technology.',
        price: 3800000,
        location: 'Bangalore, Karnataka',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[2],
        modelId: modelIds[2],
        year: 2021,
        mileage: 18000,
        color: 'Glacier White',
        images: PREMIUM_CAR_IMAGES['Audi A4'],
      },
      {
        title: 'BMW 5 Series 520d - Executive Sedan',
        description: 'Luxury BMW 5 Series 520d with executive comfort.',
        price: 5500000,
        location: 'Chennai, Tamil Nadu',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[0],
        modelId: modelIds[0],
        year: 2019,
        mileage: 35000,
        color: 'Carbon Black',
        images: PREMIUM_CAR_IMAGES['BMW 3 Series'],
      },
      {
        title: 'Mercedes E-Class E200 - Luxury Sedan',
        description: 'Premium Mercedes E-Class E200 with advanced features.',
        price: 6500000,
        location: 'Hyderabad, Telangana',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[1],
        modelId: modelIds[1],
        year: 2020,
        mileage: 22000,
        color: 'Selenite Grey',
        images: PREMIUM_CAR_IMAGES['Mercedes C-Class'],
      },
      {
        title: 'Audi A6 40 TDI - Executive Sedan',
        description: 'Executive Audi A6 40 TDI with virtual cockpit.',
        price: 5800000,
        location: 'Ahmedabad, Gujarat',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[2],
        modelId: modelIds[2],
        year: 2021,
        mileage: 15000,
        color: 'Daytona Grey',
        images: PREMIUM_CAR_IMAGES['Audi A4'],
      },
      {
        title: 'BMW 7 Series 730Ld - Flagship Sedan',
        description: 'Ultimate BMW 7 Series 730Ld with luxury amenities.',
        price: 12000000,
        location: 'Kolkata, West Bengal',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[0],
        modelId: modelIds[0],
        year: 2018,
        mileage: 45000,
        color: 'Alpine White',
        images: PREMIUM_CAR_IMAGES['BMW 3 Series'],
      },
      {
        title: 'Mercedes S-Class S350d - Luxury Flagship',
        description: 'Mercedes S-Class S350d with unparalleled luxury.',
        price: 15000000,
        location: 'Lucknow, Uttar Pradesh',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[1],
        modelId: modelIds[1],
        year: 2019,
        mileage: 30000,
        color: 'Obsidian Black',
        images: PREMIUM_CAR_IMAGES['Mercedes C-Class'],
      },
      {
        title: 'Audi A8 L 50 TDI - Executive Flagship',
        description: 'Executive Audi A8 L 50 TDI with quattro all-wheel drive.',
        price: 14000000,
        location: 'Jaipur, Rajasthan',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[2],
        modelId: modelIds[2],
        year: 2020,
        mileage: 25000,
        color: 'Glacier White',
        images: PREMIUM_CAR_IMAGES['Audi A4'],
      },
      {
        title: 'BMW 8 Series 840d - Luxury Coupe',
        description: 'Exclusive BMW 8 Series 840d with sporty luxury.',
        price: 18000000,
        location: 'Pune, Maharashtra',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[0],
        modelId: modelIds[0],
        year: 2021,
        mileage: 12000,
        color: 'Carbon Black',
        images: PREMIUM_CAR_IMAGES['BMW 3 Series'],
      },
    ];

    for (let i = 0; i < premiumCarData.length; i++) {
      const data = premiumCarData[i];
      
      // Create main Ad document first
      const ad = new this.adModel({
        title: data.title,
        description: data.description,
        price: data.price,
        images: data.images,
        location: data.location,
        category: AdCategory.PRIVATE_VEHICLE,
        postedBy: getRandomElement(expertUserIds),
        isActive: true,
      });
      const savedAd = await ad.save();

      // Create VehicleAd with reference to main Ad
      const vehicleAd = new this.vehicleAdModel({
        ad: savedAd._id,
        vehicleType: data.vehicleType,
        manufacturerId: data.manufacturerId,
        modelId: data.modelId,
        year: data.year,
        mileage: data.mileage,
        color: data.color,
        isFirstOwner: Math.random() > 0.2,
        hasInsurance: true,
        hasRcBook: true,
        additionalFeatures: ['Premium Audio System', 'Panoramic Sunroof', 'Heated Seats', '360° Camera'],
        // Add required fields with dummy IDs
        transmissionTypeId: data.manufacturerId, // Using manufacturerId as dummy
        fuelTypeId: data.modelId, // Using modelId as dummy
      });

      await vehicleAd.save();
      console.log(`   ✅ Created premium car ad: ${data.title}`);
    }
  }

  async seedPremiumVehicleAds(expertUserIds: string[], manufacturerIds: string[], modelIds: string[]) {
    console.log('🚙 Seeding Premium Vehicle Ads...');
    
    const premiumVehicleData = [
      {
        title: 'Range Rover Sport HSE - Luxury SUV',
        description: 'Premium Range Rover Sport HSE with off-road capability.',
        price: 18000000,
        location: 'Mumbai, Maharashtra',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[0],
        modelId: modelIds[0],
        year: 2020,
        mileage: 20000,
        color: 'Santorini Black',
        images: PREMIUM_VEHICLE_IMAGES['Range Rover'],
      },
      {
        title: 'BMW X5 xDrive40i - Luxury SUV',
        description: 'Powerful BMW X5 xDrive40i with xDrive all-wheel drive.',
        price: 12000000,
        location: 'Delhi, NCR',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[1],
        modelId: modelIds[1],
        year: 2021,
        mileage: 15000,
        color: 'Alpine White',
        images: PREMIUM_VEHICLE_IMAGES['BMW X5'],
      },
      {
        title: 'Mercedes GLE 300d - Premium SUV',
        description: 'Luxury Mercedes GLE 300d with advanced driver assistance.',
        price: 11000000,
        location: 'Bangalore, Karnataka',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[2],
        modelId: modelIds[2],
        year: 2020,
        mileage: 25000,
        color: 'Obsidian Black',
        images: PREMIUM_VEHICLE_IMAGES['Mercedes GLE'],
      },
      {
        title: 'Audi Q7 45 TDI - Executive SUV',
        description: 'Executive Audi Q7 45 TDI with quattro technology.',
        price: 10000000,
        location: 'Chennai, Tamil Nadu',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[0],
        modelId: modelIds[0],
        year: 2019,
        mileage: 35000,
        color: 'Glacier White',
        images: PREMIUM_VEHICLE_IMAGES['Audi Q7'],
      },
      {
        title: 'Porsche Cayenne S - Performance SUV',
        description: 'High-performance Porsche Cayenne S with sport dynamics.',
        price: 20000000,
        location: 'Hyderabad, Telangana',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[1],
        modelId: modelIds[1],
        year: 2021,
        mileage: 12000,
        color: 'Carrara White',
        images: PREMIUM_VEHICLE_IMAGES['Porsche Cayenne'],
      },
      {
        title: 'Range Rover Velar - Luxury SUV',
        description: 'Stylish Range Rover Velar with modern design.',
        price: 15000000,
        location: 'Ahmedabad, Gujarat',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[2],
        modelId: modelIds[2],
        year: 2020,
        mileage: 22000,
        color: 'Carpathian Grey',
        images: PREMIUM_VEHICLE_IMAGES['Range Rover'],
      },
      {
        title: 'BMW X7 xDrive40i - Flagship SUV',
        description: 'Ultimate BMW X7 xDrive40i with luxury and space.',
        price: 18000000,
        location: 'Kolkata, West Bengal',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[0],
        modelId: modelIds[0],
        year: 2019,
        mileage: 30000,
        color: 'Carbon Black',
        images: PREMIUM_VEHICLE_IMAGES['BMW X5'],
      },
      {
        title: 'Mercedes GLS 400d - Luxury SUV',
        description: 'Spacious Mercedes GLS 400d with premium comfort.',
        price: 16000000,
        location: 'Lucknow, Uttar Pradesh',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[1],
        modelId: modelIds[1],
        year: 2020,
        mileage: 28000,
        color: 'Selenite Grey',
        images: PREMIUM_VEHICLE_IMAGES['Mercedes GLE'],
      },
      {
        title: 'Audi Q8 50 TDI - Sportback SUV',
        description: 'Dynamic Audi Q8 50 TDI with sportback design.',
        price: 14000000,
        location: 'Jaipur, Rajasthan',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[2],
        modelId: modelIds[2],
        year: 2021,
        mileage: 18000,
        color: 'Daytona Grey',
        images: PREMIUM_VEHICLE_IMAGES['Audi Q7'],
      },
      {
        title: 'Porsche Macan Turbo - Compact SUV',
        description: 'Sporty Porsche Macan Turbo with turbo performance.',
        price: 12000000,
        location: 'Pune, Maharashtra',
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: manufacturerIds[0],
        modelId: modelIds[0],
        year: 2020,
        mileage: 20000,
        color: 'Carrara White',
        images: PREMIUM_VEHICLE_IMAGES['Porsche Cayenne'],
      },
    ];

    for (let i = 0; i < premiumVehicleData.length; i++) {
      const data = premiumVehicleData[i];
      
      // Create main Ad document first
      const ad = new this.adModel({
        title: data.title,
        description: data.description,
        price: data.price,
        images: data.images,
        location: data.location,
        category: AdCategory.PRIVATE_VEHICLE,
        postedBy: getRandomElement(expertUserIds),
        isActive: true,
      });
      const savedAd = await ad.save();

      // Create VehicleAd with reference to main Ad
      const vehicleAd = new this.vehicleAdModel({
        ad: savedAd._id,
        vehicleType: data.vehicleType,
        manufacturerId: data.manufacturerId,
        modelId: data.modelId,
        year: data.year,
        mileage: data.mileage,
        color: data.color,
        isFirstOwner: Math.random() > 0.3,
        hasInsurance: true,
        hasRcBook: true,
        additionalFeatures: ['Premium Audio System', 'Panoramic Sunroof', 'Heated Seats', '360° Camera', 'Air Suspension'],
        // Add required fields with dummy IDs
        transmissionTypeId: data.manufacturerId, // Using manufacturerId as dummy
        fuelTypeId: data.modelId, // Using modelId as dummy
      });

      await vehicleAd.save();
      console.log(`   ✅ Created premium vehicle ad: ${data.title}`);
    }
  }
}
