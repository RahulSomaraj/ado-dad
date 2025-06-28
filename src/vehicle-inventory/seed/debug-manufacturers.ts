import mongoose from 'mongoose';
import {
  Manufacturer,
  ManufacturerSchema,
} from '../schemas/manufacturer.schema';

async function debugManufacturers() {
  try {
    // Connect to MongoDB using the same environment variable as the API
    const mongoUri =
      process.env.MONGO_URI || 'mongodb://localhost:27017/ado-dad';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Create model
    const ManufacturerModel = mongoose.model(
      Manufacturer.name,
      ManufacturerSchema,
    );

    console.log('🔍 Checking manufacturer collection...\n');

    // Get all manufacturers
    const manufacturers = await ManufacturerModel.find({}).exec();

    if (manufacturers.length === 0) {
      console.log('❌ No manufacturers found in the collection');
      return;
    }

    console.log(`📊 Found ${manufacturers.length} manufacturers:\n`);

    // Show all manufacturers with their details
    manufacturers.forEach((manufacturer, index) => {
      console.log(`${index + 1}. ID: ${manufacturer._id}`);
      console.log(`   Name: "${manufacturer.name}"`);
      console.log(`   Display Name: "${manufacturer.displayName}"`);
      console.log(`   Active: ${manufacturer.isActive}`);
      console.log(`   Origin Country: ${manufacturer.originCountry}`);
      console.log(`   Founded Year: ${manufacturer.foundedYear || 'N/A'}`);
      console.log(`   Headquarters: ${manufacturer.headquarters || 'N/A'}`);
      console.log('   ---');
    });

    // Show active manufacturers only
    const activeManufacturers = manufacturers.filter((m) => m.isActive);
    console.log(
      `\n📈 Active manufacturers: ${activeManufacturers.length}/${manufacturers.length}`,
    );

    if (activeManufacturers.length > 0) {
      console.log('\nActive manufacturers:');
      activeManufacturers.forEach((manufacturer, index) => {
        console.log(
          `${index + 1}. Name: "${manufacturer.name}" | Display: "${manufacturer.displayName}"`,
        );
      });
    }
  } catch (error) {
    console.error('❌ Error checking manufacturers:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugManufacturers();
