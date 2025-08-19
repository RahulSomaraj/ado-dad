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

const ASSET_BASE_URL = 'https://ado-dad.s3.ap-south-1.amazonaws.com/uploads';

// Helper function to get random images
function getRandomImages(count = 3) {
  const shuffled = ASSET_IMAGE_NAMES.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map((name) => `${ASSET_BASE_URL}/${name}`);
}

// Helper function to get random element from array
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to get random number between min and max
function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to get random boolean
function getRandomBoolean(): boolean {
  return Math.random() > 0.5;
}

// Helper function to get random price in a range
function getRandomPrice(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

    // Extended sample user IDs
    const sampleUserIds = Array.from(
      { length: 20 },
      (_, i) => `507f1f77bcf86cd7994390${(21 + i).toString().padStart(2, '0')}`,
    );

    // Extended vehicle inventory IDs
    const sampleManufacturerIds = [
      '507f1f77bcf86cd799439031', // Honda
      '507f1f77bcf86cd799439032', // Toyota
      '507f1f77bcf86cd799439033', // Maruti Suzuki
      '507f1f77bcf86cd799439034', // Tata Motors
      '507f1f77bcf86cd799439035', // Hyundai
      '507f1f77bcf86cd799439036', // Bajaj
      '507f1f77bcf86cd799439037', // TVS
      '507f1f77bcf86cd799439038', // Hero
      '507f1f77bcf86cd799439039', // Mahindra
      '507f1f77bcf86cd799439040', // Ford
    ];

    const sampleModelIds = [
      '507f1f77bcf86cd799439041', // City
      '507f1f77bcf86cd799439042', // Innova
      '507f1f77bcf86cd799439043', // Swift
      '507f1f77bcf86cd799439044', // 407
      '507f1f77bcf86cd799439045', // i20
      '507f1f77bcf86cd799439046', // Pulsar
      '507f1f77bcf86cd799439047', // Apache
      '507f1f77bcf86cd799439048', // Splendor
      '507f1f77bcf86cd799439049', // Scorpio
      '507f1f77bcf86cd799439050', // EcoSport
    ];

    const sampleVariantIds = [
      '507f1f77bcf86cd799439051', // ZX CVT
      '507f1f77bcf86cd799439052', // GX MT
      '507f1f77bcf86cd799439053', // VXI
      '507f1f77bcf86cd799439054', // 407 Turbo
      '507f1f77bcf86cd799439055', // Asta
      '507f1f77bcf86cd799439056', // 150
      '507f1f77bcf86cd799439057', // RTR 160
      '507f1f77bcf86cd799439058', // Plus
      '507f1f77bcf86cd799439059', // S11
      '507f1f77bcf86cd799439060', // Titanium
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

    // Seed Property Ads (30 ads)
    await this.seedPropertyAds(sampleUserIds);

    // Seed Vehicle Ads (35 ads)
    await this.seedVehicleAds(
      sampleUserIds,
      sampleManufacturerIds,
      sampleModelIds,
      sampleVariantIds,
      sampleTransmissionTypeIds,
      sampleFuelTypeIds,
    );

    // Seed Commercial Vehicle Ads (20 ads)
    await this.seedCommercialVehicleAds(
      sampleUserIds,
      sampleManufacturerIds,
      sampleModelIds,
      sampleVariantIds,
      sampleTransmissionTypeIds,
      sampleFuelTypeIds,
    );

    // Seed Two Wheeler Ads (25 ads)
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

    const propertyTitles = [
      'Beautiful 2BHK Apartment in Prime Location',
      'Luxury 3BHK Villa with Private Garden',
      'Commercial Space in CBD Area',
      'Independent House with Terrace',
      'Residential Plot in Developing Area',
      'Modern 1BHK Studio Apartment',
      'Premium 4BHK Penthouse',
      'Cozy 2BHK Flat Near Metro',
      'Spacious 3BHK Duplex',
      'Investment Property in High Growth Area',
      'Luxury Apartment with City View',
      'Family Villa with Swimming Pool',
      'Office Space in Business District',
      'Retail Shop in Shopping Mall',
      'Warehouse Space for Rent',
      'Farmhouse with Agricultural Land',
      'Beachfront Property',
      'Mountain View Villa',
      'Garden Apartment Complex',
      'Serviced Apartment for Business Travelers',
      'Student Accommodation Near University',
      'Senior Living Community',
      'Luxury Condominium',
      'Townhouse in Gated Community',
      'Loft Style Apartment',
      'Heritage Property for Sale',
      'Industrial Plot with Approvals',
      'Medical Clinic Space',
      'Restaurant Space in Food Court',
      'Hotel Property for Investment',
    ];

    const propertyDescriptions = [
      'Spacious and well-maintained apartment located in the heart of the city. This property offers modern amenities, excellent connectivity, and a peaceful neighborhood.',
      'Exclusive villa with private garden, modern amenities, and premium finishes. Located in a gated community with 24/7 security.',
      'Prime commercial space in Central Business District. Perfect for retail, office, or restaurant. High footfall area with excellent connectivity.',
      'Beautiful independent house with terrace garden. Modern amenities, located in a peaceful residential area.',
      'Prime residential plot in developing area with good appreciation potential. All approvals in place, ready for construction.',
      'Compact and modern studio apartment perfect for singles or couples. Fully furnished with all basic amenities.',
      'Luxurious penthouse with panoramic city views. Premium finishes and exclusive amenities included.',
      'Well-maintained flat in a prime location with excellent metro connectivity. Perfect for daily commute.',
      'Spacious duplex with modern design and premium amenities. Ideal for large families.',
      'High-potential investment property in rapidly developing area with excellent ROI prospects.',
      'Premium apartment with stunning city skyline views. World-class amenities and security.',
      'Family-friendly villa with private swimming pool and garden. Perfect for large families.',
      'Professional office space in prime business district. Ready for immediate occupation.',
      'High-traffic retail space in popular shopping mall. Excellent business opportunity.',
      'Large warehouse space suitable for storage and logistics. Good connectivity to highways.',
      'Peaceful farmhouse with agricultural land. Perfect for weekend getaways or farming.',
      'Exclusive beachfront property with direct access to the beach. Rare opportunity.',
      'Scenic mountain view villa with fresh air and tranquility. Perfect for nature lovers.',
      'Well-maintained garden apartment with green surroundings. Family-friendly environment.',
      'Fully furnished serviced apartment perfect for business travelers. All amenities included.',
      'Student-friendly accommodation near university campus. Affordable and convenient.',
      'Senior living community with medical facilities and recreational activities.',
      'Luxury condominium with premium amenities and security. Exclusive lifestyle.',
      'Modern townhouse in gated community. Perfect balance of privacy and community living.',
      'Contemporary loft-style apartment with high ceilings and modern design.',
      'Heritage property with historical significance. Unique investment opportunity.',
      'Industrial plot with all necessary approvals. Ready for industrial development.',
      'Medical clinic space in healthcare hub. Perfect for medical professionals.',
      'Restaurant space in popular food court. High footfall and business potential.',
      'Hotel property in tourist destination. Excellent investment opportunity.',
    ];

    const locations = [
      'Bandra West, Mumbai, Maharashtra',
      'Whitefield, Bangalore, Karnataka',
      'Connaught Place, Delhi, NCR',
      'Koramangala, Bangalore, Karnataka',
      'Electronic City, Bangalore, Karnataka',
      'Andheri West, Mumbai, Maharashtra',
      'Dwarka, Delhi, NCR',
      'Pune, Maharashtra',
      'Chennai, Tamil Nadu',
      'Ahmedabad, Gujarat',
      'Hyderabad, Telangana',
      'Kolkata, West Bengal',
      'Noida, Uttar Pradesh',
      'Gurgaon, Haryana',
      'Thane, Maharashtra',
      'Navi Mumbai, Maharashtra',
      'Indore, Madhya Pradesh',
      'Jaipur, Rajasthan',
      'Lucknow, Uttar Pradesh',
      'Chandigarh, Punjab',
      'Vadodara, Gujarat',
      'Coimbatore, Tamil Nadu',
      'Bhopal, Madhya Pradesh',
      'Patna, Bihar',
      'Bhubaneswar, Odisha',
      'Guwahati, Assam',
      'Dehradun, Uttarakhand',
      'Shimla, Himachal Pradesh',
      'Goa, Goa',
      'Kerala, Kerala',
    ];

    const amenities = [
      'Gym',
      'Swimming Pool',
      'Garden',
      'Security',
      'Lift',
      '24/7 Water Supply',
      'Power Backup',
      'Private Garden',
      'Servant Quarters',
      'Modular Kitchen',
      'Parking Space',
      'Loading Area',
      'Terrace Garden',
      'Climate Control',
      'Touch Screen',
      'Reverse Camera',
      'Alloy Wheels',
      'Fog Lamps',
      'Power Windows',
      'Central Locking',
      'Music System',
      'Steering Mounted Controls',
      'Sunroof',
      'Leather Seats',
      'Navigation System',
      'Bluetooth Connectivity',
      'Climate Control',
      'Wireless Charging',
      'Ventilated Seats',
      'Connected Car Tech',
      'LED Headlamps',
      'Digital Console',
      'Mobile Charging Port',
      'External Fuel Filler',
      'Combi Brake System',
      'Digital Speedometer',
      'LED Tail Lamp',
      'Tubeless Tyres',
      'Electric Start',
      'Kick Start',
      'Racing Graphics',
      'Performance Exhaust',
      'Racing Seat',
      'LED Indicators',
      'ABS',
      'Economy Mode',
      'Side Stand Indicator',
      'Pass Light',
      'GPS Tracking',
      'Safety Features',
      'Anti-lock Braking System',
      'Load Sensing Valve',
      'Sleeping Berth',
      'GPS Navigation',
      'Fleet Management System',
    ];

    for (let i = 0; i < 30; i++) {
      const propertyType = getRandomElement(Object.values(PropertyTypeEnum));
      const bedrooms =
        propertyType === PropertyTypeEnum.COMMERCIAL ||
        propertyType === PropertyTypeEnum.PLOT
          ? 0
          : getRandomNumber(1, 5);
      const bathrooms =
        propertyType === PropertyTypeEnum.PLOT ? 0 : getRandomNumber(1, 4);
      const areaSqft = getRandomNumber(500, 5000);
      const floor =
        propertyType === PropertyTypeEnum.PLOT ? 0 : getRandomNumber(1, 25);
      const price = getRandomPrice(2000000, 50000000);

      const ad = new this.adModel({
        title: propertyTitles[i % propertyTitles.length],
        description: propertyDescriptions[i % propertyDescriptions.length],
        price: price,
        images: getRandomImages(getRandomNumber(2, 4)),
        location: getRandomElement(locations),
        category: AdCategory.PROPERTY,
        postedBy: getRandomElement(userIds),
        isActive: getRandomBoolean(),
      });
      const savedAd = await ad.save();

      const propertyAd = new this.propertyAdModel({
        ad: savedAd._id,
        propertyType: propertyType,
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        areaSqft: areaSqft,
        floor: floor,
        isFurnished: getRandomBoolean(),
        hasParking: getRandomBoolean(),
        hasGarden: getRandomBoolean(),
        amenities: amenities.slice(0, getRandomNumber(3, 8)),
      });
      await propertyAd.save();
    }

    console.log('✅ Seeded 30 property ads');
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

    const vehicleTitles = [
      'Honda City 2020 Model - Single Owner',
      'Toyota Innova Crysta 2019 - Well Maintained',
      'Maruti Swift 2021 - Low Mileage',
      'Hyundai i20 2022 - Top Model',
      'Tata Nexon 2021 - Electric Vehicle',
      'Mahindra XUV500 2018 - Family SUV',
      'Ford EcoSport 2020 - Compact SUV',
      'Renault Duster 2019 - Adventure Ready',
      'Nissan Magnite 2022 - New Model',
      'MG Hector 2021 - Connected SUV',
      'Kia Seltos 2020 - Premium SUV',
      'Skoda Rapid 2019 - German Engineering',
      'Volkswagen Polo 2021 - Hatchback',
      'BMW 3 Series 2018 - Luxury Sedan',
      'Mercedes C-Class 2019 - Premium Sedan',
      'Audi A4 2020 - Executive Sedan',
      'Jaguar XE 2018 - Sports Sedan',
      'Land Rover Discovery 2019 - Luxury SUV',
      'Volvo XC60 2020 - Safety First',
      'Lexus ES 2021 - Japanese Luxury',
      'Mitsubishi Outlander 2018 - 7 Seater',
      'Subaru Forester 2019 - All Wheel Drive',
      'Jeep Compass 2020 - American SUV',
      'Fiat Linea 2018 - Italian Design',
      'Chevrolet Beat 2019 - Compact Car',
      'Datsun GO 2020 - Budget Friendly',
      'Force Gurkha 2018 - Off Roader',
      'Isuzu D-Max 2019 - Pickup Truck',
      'Mahindra Bolero 2020 - Rural SUV',
      'Tata Sumo 2018 - People Carrier',
      'Maruti Eeco 2019 - Van',
      'Force Traveller 2020 - Passenger Van',
      'Mahindra Supro 2018 - Mini Van',
      'Tata Magic 2019 - Auto Rickshaw',
    ];

    const vehicleDescriptions = [
      'Well-maintained car in excellent condition. Single owner, full service history, no accidents. Perfect for daily commute.',
      'Family car in excellent condition. Perfect for family use. All service records available, single owner.',
      'Car in pristine condition. Low mileage, excellent fuel efficiency. Perfect for city driving.',
      'Top model with all features. Single owner, full service history.',
      'Electric vehicle with excellent range. Eco-friendly and economical to run.',
      'Spacious SUV perfect for family trips. Well-maintained with all features.',
      'Compact SUV with good ground clearance. Perfect for city and highway driving.',
      'Adventure-ready SUV with excellent off-road capabilities.',
      'New model with latest features and technology.',
      'Connected SUV with internet features and premium amenities.',
      'Premium SUV with luxury features and excellent build quality.',
      'German engineering with excellent performance and reliability.',
      'Compact hatchback perfect for city driving and parking.',
      'Luxury sedan with premium features and excellent performance.',
      'Premium sedan with world-class amenities and comfort.',
      'Executive sedan with sophisticated design and technology.',
      'Sports sedan with excellent performance and handling.',
      'Luxury SUV with premium features and excellent off-road capability.',
      'Safety-focused SUV with advanced safety features.',
      'Japanese luxury with excellent reliability and comfort.',
      '7-seater SUV perfect for large families.',
      'All-wheel drive SUV with excellent traction and stability.',
      'American SUV with robust build and good performance.',
      'Italian design with unique styling and features.',
      'Compact car perfect for city driving.',
      'Budget-friendly car with good fuel efficiency.',
      'Off-road vehicle with excellent terrain capability.',
      'Pickup truck with good payload capacity.',
      'Rural SUV with excellent ground clearance.',
      'People carrier with good seating capacity.',
      'Van with excellent cargo space.',
      'Passenger van with comfortable seating.',
      'Mini van perfect for small families.',
      'Auto rickshaw with good fuel efficiency.',
    ];

    const colors = [
      'White',
      'Silver',
      'Red',
      'Blue',
      'Black',
      'Grey',
      'Orange',
      'Green',
      'Yellow',
      'Purple',
      'Brown',
      'Pink',
      'Gold',
      'Bronze',
      'Navy Blue',
      'Maroon',
      'Teal',
      'Cream',
      'Beige',
      'Pearl White',
    ];

    const additionalFeatures = [
      'Sunroof',
      'Leather Seats',
      'Navigation System',
      'Reverse Camera',
      'Bluetooth Connectivity',
      'Climate Control',
      'Touch Screen',
      'Alloy Wheels',
      'Fog Lamps',
      'Power Windows',
      'Central Locking',
      'Music System',
      'Steering Mounted Controls',
      'Wireless Charging',
      'Ventilated Seats',
      'Connected Car Tech',
      'LED Headlamps',
      'Digital Console',
      'Mobile Charging Port',
      'External Fuel Filler',
      'Combi Brake System',
      'Digital Speedometer',
      'LED Tail Lamp',
      'Tubeless Tyres',
      'Electric Start',
      'Kick Start',
      'Racing Graphics',
      'Performance Exhaust',
      'Racing Seat',
      'LED Indicators',
      'ABS',
      'Economy Mode',
      'Side Stand Indicator',
      'Pass Light',
      'GPS Tracking',
      'Safety Features',
      'Anti-lock Braking System',
      'Load Sensing Valve',
      'Sleeping Berth',
      'GPS Navigation',
      'Fleet Management System',
      'Cruise Control',
      'Auto Headlamps',
      'Rain Sensing Wipers',
      'Push Button Start',
      'Keyless Entry',
      'Auto Climate Control',
      'Heated Seats',
      'Ventilated Seats',
      'Panoramic Sunroof',
      '360 Degree Camera',
      'Parking Sensors',
      'Auto Parking',
      'Lane Departure Warning',
      'Blind Spot Detection',
      'Forward Collision Warning',
    ];

    for (let i = 0; i < 35; i++) {
      const year = getRandomNumber(2015, 2023);
      const mileage = getRandomNumber(5000, 150000);
      const price = getRandomPrice(300000, 5000000);

      const ad = new this.adModel({
        title: vehicleTitles[i % vehicleTitles.length],
        description: vehicleDescriptions[i % vehicleDescriptions.length],
        price: price,
        images: getRandomImages(getRandomNumber(2, 4)),
        location: getRandomElement([
          'Dwarka, Delhi, NCR',
          'Andheri West, Mumbai, Maharashtra',
          'Koramangala, Bangalore, Karnataka',
          'Pune, Maharashtra',
          'Chennai, Tamil Nadu',
          'Ahmedabad, Gujarat',
          'Hyderabad, Telangana',
          'Kolkata, West Bengal',
          'Noida, Uttar Pradesh',
          'Gurgaon, Haryana',
          'Thane, Maharashtra',
          'Navi Mumbai, Maharashtra',
          'Indore, Madhya Pradesh',
          'Jaipur, Rajasthan',
          'Lucknow, Uttar Pradesh',
        ]),
        category: AdCategory.PRIVATE_VEHICLE,
        postedBy: getRandomElement(userIds),
        isActive: getRandomBoolean(),
      });
      const savedAd = await ad.save();

      const vehicleAd = new this.vehicleAdModel({
        ad: savedAd._id,
        vehicleType: VehicleTypeEnum.FOUR_WHEELER,
        manufacturerId: getRandomElement(manufacturerIds),
        modelId: getRandomElement(modelIds),
        variantId: getRandomElement(variantIds),
        year: year,
        mileage: mileage,
        transmissionTypeId: getRandomElement(transmissionTypeIds),
        fuelTypeId: getRandomElement(fuelTypeIds),
        color: getRandomElement(colors),
        isFirstOwner: getRandomBoolean(),
        hasInsurance: getRandomBoolean(),
        hasRcBook: getRandomBoolean(),
        additionalFeatures: additionalFeatures.slice(0, getRandomNumber(3, 8)),
      });
      await vehicleAd.save();
    }

    console.log('✅ Seeded 35 vehicle ads');
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

    const commercialTitles = [
      'Tata 407 Truck - Excellent Condition',
      'Mahindra Bolero Pickup - Business Ready',
      'Eicher Pro 1049 - Heavy Duty Truck',
      'Ashok Leyland Dost - Light Commercial',
      'Tata Ace - Mini Truck',
      'Mahindra Jeeto - Mini Pickup',
      'Force Traveller - Passenger Van',
      'Tata Winger - Passenger Van',
      'Mahindra Supro - Mini Van',
      'Force Gurkha - Off Road Vehicle',
      'Isuzu D-Max - Pickup Truck',
      'Mahindra Bolero Camper - Mobile Home',
      'Tata 709 - Medium Truck',
      'Ashok Leyland Boss - Medium Truck',
      'Eicher Pro 3015 - Medium Truck',
      'Tata 1109 - Heavy Truck',
      'Ashok Leyland 1616 - Heavy Truck',
      'Eicher Pro 6023 - Heavy Truck',
      'Tata Prima - Premium Truck',
      'Ashok Leyland Captain - Premium Truck',
    ];

    const commercialDescriptions = [
      'Heavy duty truck in excellent condition. Perfect for logistics and transportation business. Well-maintained with all necessary permits.',
      'Pickup in good condition. Perfect for small business transportation needs. Economical and reliable.',
      'Heavy duty truck. Excellent for long distance transportation. Well-maintained with all documents.',
      'Light commercial vehicle perfect for local deliveries. Fuel efficient and reliable.',
      'Mini truck ideal for last-mile delivery. Easy to maneuver in city traffic.',
      'Mini pickup perfect for small business needs. Economical and practical.',
      'Passenger van with comfortable seating. Perfect for group transportation.',
      'Spacious passenger van with good seating capacity. Ideal for tours and transportation.',
      'Mini van perfect for small group transportation. Economical and practical.',
      'Off-road vehicle with excellent terrain capability. Perfect for adventure tours.',
      'Pickup truck with good payload capacity. Ideal for construction and logistics.',
      'Mobile home conversion perfect for travel and tourism business.',
      'Medium truck with good payload capacity. Perfect for medium distance transportation.',
      'Reliable medium truck with excellent performance. Well-maintained and ready for business.',
      'Medium truck with good fuel efficiency. Perfect for regular transportation needs.',
      'Heavy truck with excellent payload capacity. Ideal for long distance transportation.',
      'Heavy duty truck with robust build quality. Perfect for heavy cargo transportation.',
      'Heavy truck with excellent performance. Well-maintained with all permits.',
      'Premium truck with advanced features. Perfect for premium logistics services.',
      'Premium truck with luxury features. Ideal for high-end transportation needs.',
    ];

    const bodyTypes = Object.values(BodyTypeEnum);
    const vehicleTypes = Object.values(CommercialVehicleTypeEnum);

    for (let i = 0; i < 20; i++) {
      const year = getRandomNumber(2015, 2023);
      const mileage = getRandomNumber(20000, 300000);
      const payloadCapacity = getRandomNumber(1000, 15000);
      const price = getRandomPrice(400000, 8000000);

      const ad = new this.adModel({
        title: commercialTitles[i % commercialTitles.length],
        description: commercialDescriptions[i % commercialDescriptions.length],
        price: price,
        images: getRandomImages(getRandomNumber(2, 4)),
        location: getRandomElement([
          'Pune, Maharashtra',
          'Chennai, Tamil Nadu',
          'Ahmedabad, Gujarat',
          'Mumbai, Maharashtra',
          'Delhi, NCR',
          'Bangalore, Karnataka',
          'Hyderabad, Telangana',
          'Kolkata, West Bengal',
          'Noida, Uttar Pradesh',
          'Gurgaon, Haryana',
          'Thane, Maharashtra',
          'Navi Mumbai, Maharashtra',
        ]),
        category: AdCategory.COMMERCIAL_VEHICLE,
        postedBy: getRandomElement(userIds),
        isActive: getRandomBoolean(),
      });
      const savedAd = await ad.save();

      const commercialVehicleAd = new this.commercialVehicleAdModel({
        ad: savedAd._id,
        commercialVehicleType: getRandomElement(vehicleTypes),
        bodyType: getRandomElement(bodyTypes),
        manufacturerId: getRandomElement(manufacturerIds),
        modelId: getRandomElement(modelIds),
        variantId: getRandomElement(variantIds),
        year: year,
        mileage: mileage,
        payloadCapacity: payloadCapacity,
        payloadUnit: 'kg',
        axleCount: getRandomNumber(2, 4),
        transmissionTypeId: getRandomElement(transmissionTypeIds),
        fuelTypeId: getRandomElement(fuelTypeIds),
        color: getRandomElement([
          'Blue',
          'White',
          'Red',
          'Green',
          'Yellow',
          'Orange',
          'Grey',
          'Black',
        ]),
        hasInsurance: getRandomBoolean(),
        hasFitness: getRandomBoolean(),
        hasPermit: getRandomBoolean(),
        additionalFeatures: [
          'GPS Tracking',
          'Climate Control',
          'Safety Features',
          'Anti-lock Braking System',
          'Load Sensing Valve',
          'Sleeping Berth',
          'GPS Navigation',
          'Fleet Management System',
        ].slice(0, getRandomNumber(2, 5)),
        seatingCapacity: getRandomNumber(2, 6),
      });
      await commercialVehicleAd.save();
    }

    console.log('✅ Seeded 20 commercial vehicle ads');
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

    const twoWheelerTitles = [
      'Honda Activa 6G - 2021 Model',
      'Bajaj Pulsar 150 - Sporty Ride',
      'TVS Apache RTR 160 - Racing Edition',
      'Hero Splendor Plus - Economical Ride',
      'Yamaha R15 V4 - Sports Bike',
      'Royal Enfield Classic 350 - Heritage',
      'KTM Duke 200 - Performance Bike',
      'Honda CB Shine - Reliable Commuter',
      'Suzuki Gixxer - Sporty Commuter',
      'Bajaj Platina - Economical',
      'TVS Jupiter - Family Scooter',
      'Hero HF Deluxe - Budget Friendly',
      'Yamaha FZ - Street Fighter',
      'Royal Enfield Bullet 350 - Classic',
      'KTM RC 200 - Racing Bike',
      'Honda Dio - Stylish Scooter',
      'Suzuki Access - Comfortable Scooter',
      'Bajaj CT 100 - Basic Commuter',
      'TVS Star City - City Commuter',
      'Hero Passion Pro - Reliable',
      'Yamaha Ray ZR - Sporty Scooter',
      'Royal Enfield Himalayan - Adventure',
      'KTM 390 Duke - Premium Performance',
      'Honda CB Unicorn - Smooth Ride',
      'Suzuki Intruder - Cruiser',
    ];

    const twoWheelerDescriptions = [
      'Scooter in pristine condition. Single owner, low mileage, excellent fuel efficiency. Perfect for daily commute.',
      'Sporty bike with good performance. Well-maintained, single owner.',
      'High performance bike with racing features. Excellent condition, low mileage.',
      'Economical and reliable bike. Perfect for daily commute and long rides.',
      'Sports bike with excellent performance and handling. Perfect for enthusiasts.',
      'Heritage bike with classic design and excellent build quality.',
      'Performance bike with excellent power and handling. Perfect for thrill seekers.',
      'Reliable commuter bike with good fuel efficiency. Perfect for daily use.',
      'Sporty commuter with good performance and style.',
      'Economical bike with excellent fuel efficiency. Perfect for budget-conscious buyers.',
      'Family scooter with comfortable seating and good storage.',
      'Budget-friendly bike with reliable performance.',
      'Street fighter with aggressive design and good performance.',
      'Classic bike with heritage design and excellent reliability.',
      'Racing bike with track-focused features and performance.',
      'Stylish scooter with modern design and good features.',
      'Comfortable scooter with good ride quality and features.',
      'Basic commuter bike with reliable performance and economy.',
      'City commuter with good maneuverability and fuel efficiency.',
      'Reliable bike with good performance and low maintenance.',
      'Sporty scooter with good performance and style.',
      'Adventure bike with excellent off-road capability.',
      'Premium performance bike with advanced features.',
      'Smooth riding bike with excellent comfort and reliability.',
      'Cruiser bike with comfortable riding position and style.',
    ];

    const colors = [
      'Red',
      'Black',
      'Blue',
      'White',
      'Silver',
      'Grey',
      'Orange',
      'Green',
      'Yellow',
      'Purple',
      'Brown',
      'Pink',
      'Gold',
      'Bronze',
      'Navy Blue',
      'Maroon',
      'Teal',
      'Cream',
      'Beige',
      'Pearl White',
    ];

    const additionalFeatures = [
      'Digital Console',
      'LED Headlight',
      'Mobile Charging Port',
      'External Fuel Filler',
      'Combi Brake System',
      'Digital Speedometer',
      'LED Tail Lamp',
      'Tubeless Tyres',
      'Electric Start',
      'Kick Start',
      'Racing Graphics',
      'Performance Exhaust',
      'Racing Seat',
      'LED Indicators',
      'ABS',
      'Economy Mode',
      'Side Stand Indicator',
      'Pass Light',
      'GPS Tracking',
      'Safety Features',
      'Anti-lock Braking System',
      'Load Sensing Valve',
      'Sleeping Berth',
      'GPS Navigation',
      'Fleet Management System',
    ];

    for (let i = 0; i < 25; i++) {
      const year = getRandomNumber(2015, 2023);
      const mileage = getRandomNumber(5000, 80000);
      const price = getRandomPrice(30000, 300000);

      const ad = new this.adModel({
        title: twoWheelerTitles[i % twoWheelerTitles.length],
        description: twoWheelerDescriptions[i % twoWheelerDescriptions.length],
        price: price,
        images: getRandomImages(getRandomNumber(2, 4)),
        location: getRandomElement([
          'Koramangala, Bangalore, Karnataka',
          'Dwarka, Delhi, NCR',
          'Andheri West, Mumbai, Maharashtra',
          'Pune, Maharashtra',
          'Chennai, Tamil Nadu',
          'Ahmedabad, Gujarat',
          'Hyderabad, Telangana',
          'Kolkata, West Bengal',
          'Noida, Uttar Pradesh',
          'Gurgaon, Haryana',
          'Thane, Maharashtra',
          'Navi Mumbai, Maharashtra',
          'Indore, Madhya Pradesh',
          'Jaipur, Rajasthan',
          'Lucknow, Uttar Pradesh',
        ]),
        category: AdCategory.TWO_WHEELER,
        postedBy: getRandomElement(userIds),
        isActive: getRandomBoolean(),
      });
      const savedAd = await ad.save();

      const twoWheelerAd = new this.vehicleAdModel({
        ad: savedAd._id,
        vehicleType: VehicleTypeEnum.TWO_WHEELER,
        manufacturerId: getRandomElement(manufacturerIds),
        modelId: getRandomElement(modelIds),
        variantId: getRandomElement(variantIds),
        year: year,
        mileage: mileage,
        transmissionTypeId: getRandomElement(transmissionTypeIds),
        fuelTypeId: getRandomElement(fuelTypeIds),
        color: getRandomElement(colors),
        isFirstOwner: getRandomBoolean(),
        hasInsurance: getRandomBoolean(),
        hasRcBook: getRandomBoolean(),
        additionalFeatures: additionalFeatures.slice(0, getRandomNumber(3, 8)),
      });
      await twoWheelerAd.save();
    }

    console.log('✅ Seeded 25 two-wheeler ads');
  }
}
