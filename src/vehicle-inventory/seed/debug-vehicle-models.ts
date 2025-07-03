import mongoose from 'mongoose';
import {
  VehicleModel,
  VehicleModelSchema,
} from '../schemas/vehicle-model.schema';
import {
  Manufacturer,
  ManufacturerSchema,
} from '../schemas/manufacturer.schema';

async function debugVehicleModels() {
  try {
    // Connect to MongoDB using the same environment variable as the API
    const mongoUri =
      process.env.MONGO_URI || 'mongodb://localhost:27017/ado-dad';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Create models
    const VehicleModelModel = mongoose.model(
      VehicleModel.name,
      VehicleModelSchema,
    );
    const ManufacturerModel = mongoose.model(
      Manufacturer.name,
      ManufacturerSchema,
    );

    // Get all vehicle models
    const models = await VehicleModelModel.find({})
      .populate('manufacturer')
      .exec();

    if (models.length === 0) {
      console.log('❌ No vehicle models found in the collection');
      return;
    }

    console.log(`📊 Found ${models.length} vehicle models:\n`);
    models.forEach((model, index) => {
      const manufacturer = model.manufacturer as any;
      const manufacturerName =
        manufacturer?.displayName || manufacturer?.name || manufacturer;
      console.log(
        `${index + 1}. Name: "${model.name}" | Display: "${model.displayName}" | Manufacturer: "${manufacturerName}" | Type: "${model.vehicleType}"`,
      );
    });
  } catch (error) {
    console.error('❌ Error checking vehicle models:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugVehicleModels();
