import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { VehicleVariantSeedService } from './seed-vehicle-variants';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const vehicleVariantSeedService = app.get(VehicleVariantSeedService);
    await vehicleVariantSeedService.seedAll();
    console.log('Vehicle variant seeding completed successfully!');
  } catch (error) {
    console.error('Error during vehicle variant seeding:', error);
  } finally {
    await app.close();
  }
}

bootstrap(); 