import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { VehicleVariantSeedService } from './seed-vehicle-variants';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const vehicleVariantSeedService = app.get(VehicleVariantSeedService);

    // Get the models
    const vehicleVariantModel =
      vehicleVariantSeedService['vehicleVariantModel'];
    const vehicleModelModel = vehicleVariantSeedService['vehicleModelModel'];
    const fuelTypeModel = vehicleVariantSeedService['fuelTypeModel'];
    const transmissionTypeModel =
      vehicleVariantSeedService['transmissionTypeModel'];

    console.log('=== Cleaning and Reseeding Vehicle Variants ===');

    // Step 1: Remove all existing variants
    console.log('Removing all existing vehicle variants...');
    const deleteResult = await vehicleVariantModel.deleteMany({}).exec();
    console.log(`Deleted ${deleteResult.deletedCount} existing variants`);

    // Step 2: Get live data from database
    console.log('\n=== Fetching Live Data from Database ===');

    const vehicleModels = await vehicleModelModel
      .find({ isActive: true, isDeleted: false })
      .exec();
    console.log(`Found ${vehicleModels.length} active vehicle models`);

    const fuelTypes = await fuelTypeModel
      .find({ isActive: true, isDeleted: false })
      .exec();
    console.log(`Found ${fuelTypes.length} active fuel types`);

    const transmissionTypes = await transmissionTypeModel
      .find({ isActive: true, isDeleted: false })
      .exec();
    console.log(`Found ${transmissionTypes.length} active transmission types`);

    // Step 3: Validate that we have the minimum required data
    if (vehicleModels.length === 0) {
      throw new Error(
        'No active vehicle models found. Please seed vehicle models first.',
      );
    }
    if (fuelTypes.length === 0) {
      throw new Error(
        'No active fuel types found. Please seed fuel types first.',
      );
    }
    if (transmissionTypes.length === 0) {
      throw new Error(
        'No active transmission types found. Please seed transmission types first.',
      );
    }

    // Step 4: Display sample data for verification
    console.log('\n=== Sample Live Data ===');
    console.log('Sample Vehicle Models:');
    vehicleModels.slice(0, 3).forEach((model, index) => {
      console.log(`  ${index + 1}. ${model.name} (${model.vehicleType})`);
    });

    console.log('\nSample Fuel Types:');
    fuelTypes.slice(0, 3).forEach((fuel, index) => {
      console.log(`  ${index + 1}. ${fuel.name}`);
    });

    console.log('\nSample Transmission Types:');
    transmissionTypes.slice(0, 3).forEach((trans, index) => {
      console.log(`  ${index + 1}. ${trans.name}`);
    });

    // Step 5: Reseed variants using live data
    console.log('\n=== Reseeding Variants with Live Data ===');
    await vehicleVariantSeedService.seedVehicleVariants();

    // Step 6: Verify the results
    console.log('\n=== Verification ===');
    const newVariants = await vehicleVariantModel
      .find({})
      .populate('vehicleModel', 'name displayName')
      .populate('fuelType', 'name displayName')
      .populate('transmissionType', 'name displayName')
      .exec();

    console.log(`Created ${newVariants.length} new variants`);

    if (newVariants.length > 0) {
      console.log('\n=== Sample New Variants ===');
      newVariants.slice(0, 5).forEach((variant, index) => {
        console.log(`${index + 1}. ${variant.displayName}`);
        console.log(`   Model: ${variant.vehicleModel['name']}`);
        console.log(`   Fuel: ${variant.fuelType['name']}`);
        console.log(`   Transmission: ${variant.transmissionType['name']}`);
        console.log(`   Price: ₹${variant.price.toLocaleString()}`);
        console.log('');
      });
    }

    console.log('\n=== Clean and Reseed Completed Successfully ===');
    console.log(`✅ Deleted ${deleteResult.deletedCount} old variants`);
    console.log(`✅ Created ${newVariants.length} new variants`);
    console.log(`✅ All variants now use live data from database`);
  } catch (error) {
    console.error('Error during clean and reseed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
});
