import mongoose from 'mongoose';
import {
  VehicleModel,
  VehicleModelSchema,
} from '../schemas/vehicle-model.schema';
import {
  Manufacturer,
  ManufacturerSchema,
} from '../schemas/manufacturer.schema';
import { VehicleTypes } from '../../vehicles/enum/vehicle.type';

async function bootstrap() {
  try {
    // Connect to MongoDB using the same environment variable as the API
    const mongoUri =
      process.env.MONGO_URI || 'mongodb://localhost:27017/ado-dad';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Create models
    const ManufacturerModel = mongoose.model(
      Manufacturer.name,
      ManufacturerSchema,
    );
    const VehicleModelModel = mongoose.model(
      VehicleModel.name,
      VehicleModelSchema,
    );

    console.log('🚗 Starting vehicle model seeding...');

    // Get all manufacturers for reference
    const manufacturers = await ManufacturerModel.find({
      isActive: true,
    }).exec();
    const manufacturerMap = new Map();
    manufacturers.forEach((m) => manufacturerMap.set(m.name, m._id));

    console.log(`📊 Found ${manufacturers.length} active manufacturers`);

    if (manufacturers.length === 0) {
      console.log('❌ No active manufacturers found. Exiting.');
      return;
    }

    // Define vehicle models for each manufacturer
    const manufacturerModels = {
      // Maruti Suzuki - Multiple entries for both maruti-suzuki and maruti_suzuki
      'maruti-suzuki': [
        {
          name: 'swift',
          displayName: 'Swift',
          vehicleType: VehicleTypes.HATCHBACK,
          description: 'Popular hatchback known for fuel efficiency',
          launchYear: 2005,
          segment: 'B',
          bodyType: 'Hatchback',
        },
        {
          name: 'dzire',
          displayName: 'Dzire',
          vehicleType: VehicleTypes.SEDAN,
          description: 'Compact sedan based on Swift platform',
          launchYear: 2008,
          segment: 'B',
          bodyType: 'Sedan',
        },
        {
          name: 'brezza',
          displayName: 'Brezza',
          vehicleType: VehicleTypes.SUB_COMPACT_SUV,
          description: 'Compact SUV with modern design',
          launchYear: 2016,
          segment: 'B',
          bodyType: 'SUV',
        },
        {
          name: 'ertiga',
          displayName: 'Ertiga',
          vehicleType: VehicleTypes.MUV,
          description: '7-seater MPV perfect for family use',
          launchYear: 2012,
          segment: 'C',
          bodyType: 'MPV',
        },
      ],
      maruti_suzuki: [
        {
          name: 'swift',
          displayName: 'Swift',
          vehicleType: VehicleTypes.HATCHBACK,
          description: 'Popular hatchback known for fuel efficiency',
          launchYear: 2005,
          segment: 'B',
          bodyType: 'Hatchback',
        },
        {
          name: 'dzire',
          displayName: 'Dzire',
          vehicleType: VehicleTypes.SEDAN,
          description: 'Compact sedan based on Swift platform',
          launchYear: 2008,
          segment: 'B',
          bodyType: 'Sedan',
        },
        {
          name: 'brezza',
          displayName: 'Brezza',
          vehicleType: VehicleTypes.SUB_COMPACT_SUV,
          description: 'Compact SUV with modern design',
          launchYear: 2016,
          segment: 'B',
          bodyType: 'SUV',
        },
        {
          name: 'ertiga',
          displayName: 'Ertiga',
          vehicleType: VehicleTypes.MUV,
          description: '7-seater MPV perfect for family use',
          launchYear: 2012,
          segment: 'C',
          bodyType: 'MPV',
        },
      ],

      // Honda
      honda: [
        {
          name: 'city',
          displayName: 'City',
          vehicleType: VehicleTypes.SEDAN,
          description: 'Premium sedan with excellent build quality',
          launchYear: 1998,
          segment: 'C',
          bodyType: 'Sedan',
        },
        {
          name: 'amaze',
          displayName: 'Amaze',
          vehicleType: VehicleTypes.SEDAN,
          description: 'Compact sedan with Honda reliability',
          launchYear: 2013,
          segment: 'B',
          bodyType: 'Sedan',
        },
        {
          name: 'jazz',
          displayName: 'Jazz',
          vehicleType: VehicleTypes.HATCHBACK,
          description: 'Premium hatchback with versatile interior',
          launchYear: 2009,
          segment: 'B',
          bodyType: 'Hatchback',
        },
        {
          name: 'activa',
          displayName: 'Activa',
          vehicleType: VehicleTypes.TWOWHEELER,
          description: "India's most popular scooter",
          launchYear: 2001,
          segment: 'Scooter',
          bodyType: 'Scooter',
        },
      ],

      // Toyota
      toyota: [
        {
          name: 'innova_crysta',
          displayName: 'Innova Crysta',
          vehicleType: VehicleTypes.MUV,
          description: 'Premium MPV with excellent comfort',
          launchYear: 2016,
          segment: 'D',
          bodyType: 'MPV',
        },
        {
          name: 'fortuner',
          displayName: 'Fortuner',
          vehicleType: VehicleTypes.SUV,
          description: 'Premium SUV with commanding presence',
          launchYear: 2009,
          segment: 'D',
          bodyType: 'SUV',
        },
        {
          name: 'camry',
          displayName: 'Camry',
          vehicleType: VehicleTypes.SEDAN,
          description: 'Luxury sedan with hybrid technology',
          launchYear: 2002,
          segment: 'E',
          bodyType: 'Sedan',
        },
        {
          name: 'glanza',
          displayName: 'Glanza',
          vehicleType: VehicleTypes.HATCHBACK,
          description: 'Premium hatchback with modern features',
          launchYear: 2019,
          segment: 'B',
          bodyType: 'Hatchback',
        },
      ],

      // Hyundai
      hyundai: [
        {
          name: 'i20',
          displayName: 'i20',
          vehicleType: VehicleTypes.HATCHBACK,
          description: 'Premium hatchback with modern design',
          launchYear: 2008,
          segment: 'B',
          bodyType: 'Hatchback',
        },
        {
          name: 'verna',
          displayName: 'Verna',
          vehicleType: VehicleTypes.SEDAN,
          description: 'Sporty sedan with excellent performance',
          launchYear: 2006,
          segment: 'C',
          bodyType: 'Sedan',
        },
        {
          name: 'creta',
          displayName: 'Creta',
          vehicleType: VehicleTypes.SUB_COMPACT_SUV,
          description: 'Compact SUV with modern design',
          launchYear: 2015,
          segment: 'B',
          bodyType: 'SUV',
        },
        {
          name: 'venue',
          displayName: 'Venue',
          vehicleType: VehicleTypes.SUB_COMPACT_SUV,
          description: 'Micro SUV with modern features',
          launchYear: 2019,
          segment: 'B',
          bodyType: 'SUV',
        },
      ],

      // Tata Motors
      tata_motors: [
        {
          name: 'nexon',
          displayName: 'Nexon',
          vehicleType: VehicleTypes.SUV,
          description: "India's first 5-star safety rated electric SUV",
          launchYear: 2017,
          segment: 'B',
          bodyType: 'SUV',
        },
        {
          name: 'punch',
          displayName: 'Punch',
          vehicleType: VehicleTypes.SUB_COMPACT_SUV,
          description: 'Micro SUV with 5-star safety rating',
          launchYear: 2021,
          segment: 'B',
          bodyType: 'SUV',
        },
        {
          name: 'altroz',
          displayName: 'Altroz',
          vehicleType: VehicleTypes.HATCHBACK,
          description: 'Premium hatchback with 5-star safety rating',
          launchYear: 2020,
          segment: 'B',
          bodyType: 'Hatchback',
        },
        {
          name: 'tiago',
          displayName: 'Tiago',
          vehicleType: VehicleTypes.HATCHBACK,
          description: 'Compact hatchback with excellent safety',
          launchYear: 2016,
          segment: 'A',
          bodyType: 'Hatchback',
        },
      ],

      // Mahindra
      mahindra: [
        {
          name: 'xuv700',
          displayName: 'XUV700',
          vehicleType: VehicleTypes.SUV,
          description: 'Premium SUV with advanced ADAS features',
          launchYear: 2021,
          segment: 'D',
          bodyType: 'SUV',
        },
        {
          name: 'thar',
          displayName: 'Thar',
          vehicleType: VehicleTypes.SUV,
          description: 'Iconic off-roader with modern features',
          launchYear: 2020,
          segment: 'C',
          bodyType: 'SUV',
        },
        {
          name: 'scorpio',
          displayName: 'Scorpio',
          vehicleType: VehicleTypes.SUV,
          description: 'Legendary SUV with commanding presence',
          launchYear: 2002,
          segment: 'D',
          bodyType: 'SUV',
        },
        {
          name: 'bolero',
          displayName: 'Bolero',
          vehicleType: VehicleTypes.SUV,
          description: 'Rugged SUV for rural and urban use',
          launchYear: 2000,
          segment: 'C',
          bodyType: 'SUV',
        },
      ],

      // Kia
      kia: [
        {
          name: 'sonet',
          displayName: 'Sonet',
          vehicleType: VehicleTypes.SUB_COMPACT_SUV,
          description: 'Compact SUV with premium features',
          launchYear: 2020,
          segment: 'B',
          bodyType: 'SUV',
        },
        {
          name: 'seltos',
          displayName: 'Seltos',
          vehicleType: VehicleTypes.SUB_COMPACT_SUV,
          description: 'Mid-size SUV with modern design',
          launchYear: 2019,
          segment: 'C',
          bodyType: 'SUV',
        },
        {
          name: 'carens',
          displayName: 'Carens',
          vehicleType: VehicleTypes.MUV,
          description: 'Premium MPV with SUV-like design',
          launchYear: 2022,
          segment: 'C',
          bodyType: 'MPV',
        },
        {
          name: 'rio',
          displayName: 'Rio',
          vehicleType: VehicleTypes.HATCHBACK,
          description: 'Compact hatchback with modern features',
          launchYear: 2017,
          segment: 'B',
          bodyType: 'Hatchback',
        },
      ],

      // BMW
      bmw: [
        {
          name: '3_series',
          displayName: '3 Series',
          vehicleType: VehicleTypes.SEDAN,
          description: 'Luxury sports sedan with excellent driving dynamics',
          launchYear: 1975,
          segment: 'E',
          bodyType: 'Sedan',
        },
        {
          name: 'x1',
          displayName: 'X1',
          vehicleType: VehicleTypes.SUB_COMPACT_SUV,
          description: 'Compact luxury SUV with sporty character',
          launchYear: 2009,
          segment: 'C',
          bodyType: 'SUV',
        },
        {
          name: 'x3',
          displayName: 'X3',
          vehicleType: VehicleTypes.SUV,
          description: 'Mid-size luxury SUV with excellent performance',
          launchYear: 2003,
          segment: 'D',
          bodyType: 'SUV',
        },
        {
          name: '5_series',
          displayName: '5 Series',
          vehicleType: VehicleTypes.SEDAN,
          description: 'Executive luxury sedan with advanced technology',
          launchYear: 1972,
          segment: 'F',
          bodyType: 'Sedan',
        },
      ],

      // Mercedes-Benz
      mercedes_benz: [
        {
          name: 'c_class',
          displayName: 'C-Class',
          vehicleType: VehicleTypes.SEDAN,
          description: 'Luxury sedan with sophisticated design',
          launchYear: 1993,
          segment: 'E',
          bodyType: 'Sedan',
        },
        {
          name: 'e_class',
          displayName: 'E-Class',
          vehicleType: VehicleTypes.SEDAN,
          description: 'Executive luxury sedan with advanced features',
          launchYear: 1953,
          segment: 'F',
          bodyType: 'Sedan',
        },
        {
          name: 'gla',
          displayName: 'GLA',
          vehicleType: VehicleTypes.SUB_COMPACT_SUV,
          description: 'Compact luxury SUV with urban appeal',
          launchYear: 2013,
          segment: 'C',
          bodyType: 'SUV',
        },
        {
          name: 's_class',
          displayName: 'S-Class',
          vehicleType: VehicleTypes.SEDAN,
          description: 'Flagship luxury sedan with cutting-edge technology',
          launchYear: 1972,
          segment: 'F',
          bodyType: 'Sedan',
        },
      ],

      // Hero MotoCorp
      hero_moto: [
        {
          name: 'splendor',
          displayName: 'Splendor',
          vehicleType: VehicleTypes.TWOWHEELER,
          description: "India's most trusted motorcycle",
          launchYear: 1994,
          segment: 'Commuter',
          bodyType: 'Motorcycle',
        },
        {
          name: 'passion',
          displayName: 'Passion',
          vehicleType: VehicleTypes.TWOWHEELER,
          description: 'Stylish commuter motorcycle for young riders',
          launchYear: 2001,
          segment: 'Commuter',
          bodyType: 'Motorcycle',
        },
        {
          name: 'xpulse',
          displayName: 'XPulse',
          vehicleType: VehicleTypes.TWOWHEELER,
          description: 'Adventure motorcycle for off-road enthusiasts',
          launchYear: 2019,
          segment: 'Adventure',
          bodyType: 'Motorcycle',
        },
        {
          name: 'pleasure',
          displayName: 'Pleasure',
          vehicleType: VehicleTypes.TWOWHEELER,
          description: 'Stylish scooter designed for women',
          launchYear: 2006,
          segment: 'Scooter',
          bodyType: 'Scooter',
        },
      ],

      // Bajaj Auto
      bajaj_auto: [
        {
          name: 'pulsar',
          displayName: 'Pulsar',
          vehicleType: VehicleTypes.TWOWHEELER,
          description: 'Iconic performance motorcycle for young riders',
          launchYear: 2001,
          segment: 'Performance',
          bodyType: 'Motorcycle',
        },
        {
          name: 'platina',
          displayName: 'Platina',
          vehicleType: VehicleTypes.TWOWHEELER,
          description: 'Fuel-efficient commuter motorcycle',
          launchYear: 2006,
          segment: 'Commuter',
          bodyType: 'Motorcycle',
        },
        {
          name: 'ct100',
          displayName: 'CT100',
          vehicleType: VehicleTypes.TWOWHEELER,
          description: 'Entry-level motorcycle with excellent fuel efficiency',
          launchYear: 2014,
          segment: 'Entry',
          bodyType: 'Motorcycle',
        },
        {
          name: 'avenger',
          displayName: 'Avenger',
          vehicleType: VehicleTypes.TWOWHEELER,
          description: 'Cruiser motorcycle with comfortable riding position',
          launchYear: 2005,
          segment: 'Cruiser',
          bodyType: 'Motorcycle',
        },
      ],

      // TVS Motor
      tvs_motor: [
        {
          name: 'apache_rtr',
          displayName: 'Apache RTR',
          vehicleType: VehicleTypes.TWOWHEELER,
          description: 'Sporty motorcycle with racing DNA',
          launchYear: 2005,
          segment: 'Performance',
          bodyType: 'Motorcycle',
        },
        {
          name: 'jupiter',
          displayName: 'Jupiter',
          vehicleType: VehicleTypes.TWOWHEELER,
          description: 'Premium scooter with modern features',
          launchYear: 2013,
          segment: 'Scooter',
          bodyType: 'Scooter',
        },
        {
          name: 'ntorq',
          displayName: 'NTorq',
          vehicleType: VehicleTypes.TWOWHEELER,
          description: 'Sporty scooter with connected features',
          launchYear: 2018,
          segment: 'Scooter',
          bodyType: 'Scooter',
        },
        {
          name: 'raider',
          displayName: 'Raider',
          vehicleType: VehicleTypes.TWOWHEELER,
          description: 'Sporty commuter motorcycle with modern design',
          launchYear: 2021,
          segment: 'Commuter',
          bodyType: 'Motorcycle',
        },
      ],

      // Ashok Leyland
      ashok_leyland: [
        {
          name: '407_truck',
          displayName: '407 Truck',
          vehicleType: VehicleTypes.TRUCK,
          description: 'Light commercial truck for urban logistics',
          launchYear: 1993,
          segment: 'LCV',
          bodyType: 'Truck',
        },
        {
          name: 'boss_truck',
          displayName: 'Boss Truck',
          vehicleType: VehicleTypes.TRUCK,
          description: 'Heavy commercial truck for long-haul transportation',
          launchYear: 2008,
          segment: 'HCV',
          bodyType: 'Truck',
        },
        {
          name: 'dost_truck',
          displayName: 'Dost Truck',
          vehicleType: VehicleTypes.TRUCK,
          description: 'Light commercial vehicle for last-mile delivery',
          launchYear: 2011,
          segment: 'LCV',
          bodyType: 'Truck',
        },
        {
          name: 'partner_truck',
          displayName: 'Partner Truck',
          vehicleType: VehicleTypes.TRUCK,
          description: 'Medium commercial truck for urban distribution',
          launchYear: 2003,
          segment: 'MCV',
          bodyType: 'Truck',
        },
      ],

      // Default models for other manufacturers
      default: [
        {
          name: 'model_a',
          displayName: 'Model A',
          vehicleType: VehicleTypes.SEDAN,
          description: 'Premium sedan with modern features',
          launchYear: 2020,
          segment: 'C',
          bodyType: 'Sedan',
        },
        {
          name: 'model_b',
          displayName: 'Model B',
          vehicleType: VehicleTypes.HATCHBACK,
          description: 'Compact hatchback for urban use',
          launchYear: 2021,
          segment: 'B',
          bodyType: 'Hatchback',
        },
        {
          name: 'model_c',
          displayName: 'Model C',
          vehicleType: VehicleTypes.SUV,
          description: 'Versatile SUV for family use',
          launchYear: 2019,
          segment: 'C',
          bodyType: 'SUV',
        },
        {
          name: 'model_d',
          displayName: 'Model D',
          vehicleType: VehicleTypes.TWOWHEELER,
          description: 'Reliable two-wheeler for daily commute',
          launchYear: 2018,
          segment: 'Commuter',
          bodyType: 'Motorcycle',
        },
      ],
    };

    let createdCount = 0;
    let skippedCount = 0;

    for (const manufacturer of manufacturers) {
      const models =
        manufacturerModels[manufacturer.name] || manufacturerModels['default'];

      for (const modelData of models) {
        const modelName = modelData.name;
        const displayName = modelData.displayName;
        const vehicleType = modelData.vehicleType;
        const description = modelData.description;
        const launchYear = modelData.launchYear;
        const segment = modelData.segment;
        const bodyType = modelData.bodyType;
        const images = [manufacturer.logo];
        const brochureUrl = manufacturer.website;

        // Check if a model already exists for this manufacturer
        const exists = await VehicleModelModel.findOne({
          name: modelName,
          manufacturer: manufacturer._id,
        }).exec();

        if (!exists) {
          await VehicleModelModel.create({
            name: modelName,
            displayName,
            manufacturer: manufacturer._id,
            vehicleType,
            description,
            launchYear,
            segment,
            bodyType,
            images,
            brochureUrl,
            isActive: true,
          });
          console.log(
            `✅ Created vehicle model: ${displayName} (${manufacturer.name})`,
          );
          createdCount++;
        } else {
          console.log(
            `⏭️  Vehicle model already exists: ${displayName} (${manufacturer.name})`,
          );
          skippedCount++;
        }
      }
    }

    console.log('==========================================');
    console.log(`✅ Vehicle model seeding completed!`);
    console.log(`📊 Created: ${createdCount} models`);
    console.log(`⏭️  Skipped: ${skippedCount} models (already exist)`);
    console.log(`📈 Total processed: ${createdCount + skippedCount} models`);
  } catch (error) {
    console.error('❌ Error during vehicle model seeding:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

bootstrap();
