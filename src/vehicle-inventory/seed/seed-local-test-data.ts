import mongoose from 'mongoose';
import {
  Manufacturer,
  ManufacturerSchema,
} from '../schemas/manufacturer.schema';
import {
  VehicleModel,
  VehicleModelSchema,
} from '../schemas/vehicle-model.schema';
import { VehicleTypes } from '../../vehicles/enum/vehicle.type';

async function bootstrap() {
  try {
    // Connect to local MongoDB
    const mongoUri = 'mongodb://localhost:27017/ado-dad';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to local MongoDB');

    // Create models
    const ManufacturerModel = mongoose.model(
      Manufacturer.name,
      ManufacturerSchema,
    );
    const VehicleModelModel = mongoose.model(
      VehicleModel.name,
      VehicleModelSchema,
    );

    console.log('🚗 Starting local test data seeding...');

    // Clear existing data
    await ManufacturerModel.deleteMany({});
    await VehicleModelModel.deleteMany({});

    // Create test manufacturers
    const manufacturers = [
      {
        name: 'maruti_suzuki',
        displayName: 'Maruti Suzuki',
        originCountry: 'India',
        description: 'Popular Indian car manufacturer',
        logo: 'https://example.com/logos/maruti-suzuki.png',
        website: 'https://www.marutisuzuki.com',
        foundedYear: 1981,
        headquarters: 'New Delhi, India',
        isActive: true,
      },
      {
        name: 'honda',
        displayName: 'Honda',
        originCountry: 'Japan',
        description: 'Japanese automotive manufacturer',
        logo: 'https://example.com/logos/honda.png',
        website: 'https://www.honda.com',
        foundedYear: 1948,
        headquarters: 'Tokyo, Japan',
        isActive: true,
      },
      {
        name: 'toyota',
        displayName: 'Toyota',
        originCountry: 'Japan',
        description: "World's largest automotive manufacturer",
        logo: 'https://example.com/logos/toyota.png',
        website: 'https://www.toyota.com',
        foundedYear: 1937,
        headquarters: 'Toyota City, Japan',
        isActive: true,
      },
    ];

    const createdManufacturers =
      await ManufacturerModel.insertMany(manufacturers);
    console.log(`✅ Created ${createdManufacturers.length} manufacturers`);

    // Create manufacturer map
    const manufacturerMap = new Map();
    createdManufacturers.forEach((m) => manufacturerMap.set(m.name, m._id));

    // Create test vehicle models
    const vehicleModels = [
      // Maruti Suzuki models
      {
        name: 'swift',
        displayName: 'Swift',
        manufacturer: manufacturerMap.get('maruti_suzuki'),
        vehicleType: VehicleTypes.HATCHBACK,
        description: 'Popular hatchback known for fuel efficiency',
        launchYear: 2005,
        segment: 'B',
        bodyType: 'Hatchback',
        isActive: true,
      },
      {
        name: 'dzire',
        displayName: 'Dzire',
        manufacturer: manufacturerMap.get('maruti_suzuki'),
        vehicleType: VehicleTypes.SEDAN,
        description: 'Compact sedan based on Swift platform',
        launchYear: 2008,
        segment: 'B',
        bodyType: 'Sedan',
        isActive: true,
      },
      {
        name: 'brezza',
        displayName: 'Brezza',
        manufacturer: manufacturerMap.get('maruti_suzuki'),
        vehicleType: VehicleTypes.SUB_COMPACT_SUV,
        description: 'Compact SUV with modern design',
        launchYear: 2016,
        segment: 'B',
        bodyType: 'SUV',
        isActive: true,
      },

      // Honda models
      {
        name: 'city',
        displayName: 'City',
        manufacturer: manufacturerMap.get('honda'),
        vehicleType: VehicleTypes.SEDAN,
        description: 'Premium sedan with excellent build quality',
        launchYear: 1998,
        segment: 'C',
        bodyType: 'Sedan',
        isActive: true,
      },
      {
        name: 'amaze',
        displayName: 'Amaze',
        manufacturer: manufacturerMap.get('honda'),
        vehicleType: VehicleTypes.SEDAN,
        description: 'Compact sedan with Honda reliability',
        launchYear: 2013,
        segment: 'B',
        bodyType: 'Sedan',
        isActive: true,
      },
      {
        name: 'activa',
        displayName: 'Activa',
        manufacturer: manufacturerMap.get('honda'),
        vehicleType: VehicleTypes.TWOWHEELER,
        description: "India's most popular scooter",
        launchYear: 2001,
        segment: 'Scooter',
        bodyType: 'Scooter',
        isActive: true,
      },

      // Toyota models
      {
        name: 'innova_crysta',
        displayName: 'Innova Crysta',
        manufacturer: manufacturerMap.get('toyota'),
        vehicleType: VehicleTypes.MUV,
        description: 'Premium MPV with excellent comfort',
        launchYear: 2016,
        segment: 'D',
        bodyType: 'MPV',
        isActive: true,
      },
      {
        name: 'fortuner',
        displayName: 'Fortuner',
        manufacturer: manufacturerMap.get('toyota'),
        vehicleType: VehicleTypes.SUV,
        description: 'Premium SUV with commanding presence',
        launchYear: 2009,
        segment: 'D',
        bodyType: 'SUV',
        isActive: true,
      },
    ];

    const createdVehicleModels =
      await VehicleModelModel.insertMany(vehicleModels);
    console.log(`✅ Created ${createdVehicleModels.length} vehicle models`);

    console.log('🎉 Local test data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during local test data seeding:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

bootstrap().catch((error) => {
  console.error('❌ Failed to seed local test data:', error);
  process.exit(1);
});
