import mongoose from 'mongoose';
import {
  Manufacturer,
  ManufacturerSchema,
} from '../schemas/manufacturer.schema';

async function checkManufacturers() {
  try {
    // Connect to MongoDB
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
    console.log(
      '┌─────────────────────────────────────────────────────────────────────────────┐',
    );
    console.log(
      '│ ID                                    │ Name                │ Display Name  │',
    );
    console.log(
      '├─────────────────────────────────────────────────────────────────────────────┤',
    );

    manufacturers.forEach((manufacturer, index) => {
      const id = manufacturer._id.toString().substring(0, 8) + '...';
      const name = manufacturer.name.padEnd(20);
      const displayName = manufacturer.displayName.padEnd(15);
      console.log(`│ ${id} │ ${name} │ ${displayName} │`);
    });

    console.log(
      '└─────────────────────────────────────────────────────────────────────────────┘\n',
    );

    // Show active manufacturers only
    const activeManufacturers = manufacturers.filter((m) => m.isActive);
    console.log(
      `📈 Active manufacturers: ${activeManufacturers.length}/${manufacturers.length}\n`,
    );

    if (activeManufacturers.length > 0) {
      console.log('Active manufacturers:');
      activeManufacturers.forEach((manufacturer, index) => {
        console.log(
          `${index + 1}. Name: "${manufacturer.name}" | Display: "${manufacturer.displayName}"`,
        );
      });
    }

    // Show inactive manufacturers
    const inactiveManufacturers = manufacturers.filter((m) => !m.isActive);
    if (inactiveManufacturers.length > 0) {
      console.log(
        `\n❌ Inactive manufacturers (${inactiveManufacturers.length}):`,
      );
      inactiveManufacturers.forEach((manufacturer, index) => {
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

checkManufacturers();
