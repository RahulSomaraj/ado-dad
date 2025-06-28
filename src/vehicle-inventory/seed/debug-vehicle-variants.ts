import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { VehicleVariantSeedService } from './seed-vehicle-variants';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const vehicleVariantSeedService = app.get(VehicleVariantSeedService);

    // Get the models to check data
    const vehicleVariantModel =
      vehicleVariantSeedService['vehicleVariantModel'];
    const vehicleModelModel = vehicleVariantSeedService['vehicleModelModel'];
    const fuelTypeModel = vehicleVariantSeedService['fuelTypeModel'];
    const transmissionTypeModel =
      vehicleVariantSeedService['transmissionTypeModel'];

    console.log('=== Checking Vehicle Variants ===');

    const variants = await vehicleVariantModel
      .find({})
      .populate('vehicleModel')
      .populate('fuelType')
      .populate('transmissionType')
      .exec();
    console.log(`Total vehicle variants: ${variants.length}`);

    if (variants.length > 0) {
      console.log('\n=== Sample Variants ===');
      variants.slice(0, 5).forEach((variant, index) => {
        console.log(`${index + 1}. ${variant.displayName}`);
        console.log(`   Model: ${variant.vehicleModel['name']}`);
        console.log(`   Fuel: ${variant.fuelType['name']}`);
        console.log(`   Transmission: ${variant.transmissionType['name']}`);
        console.log(`   Package: ${variant.featurePackage}`);
        console.log(`   Price: ₹${variant.price.toLocaleString()}`);
        console.log(`   Colors: ${variant.colors?.join(', ') || 'N/A'}`);
        console.log('');
      });
    }

    console.log('=== Checking Related Data ===');
    const models = await vehicleModelModel.find({}).exec();
    const fuelTypes = await fuelTypeModel.find({}).exec();
    const transmissionTypes = await transmissionTypeModel.find({}).exec();

    console.log(`Vehicle models: ${models.length}`);
    console.log(`Fuel types: ${fuelTypes.length}`);
    console.log(`Transmission types: ${transmissionTypes.length}`);
  } catch (error) {
    console.error('Error during debug:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
