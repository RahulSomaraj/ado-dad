import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { ManufacturerSeedService } from './seed-manufacturers';

async function bootstrap() {
  console.log('🚀 Starting Manufacturer data seeding process...');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const manufacturerSeedService = app.get(ManufacturerSeedService);

    await manufacturerSeedService.seedAll();

    console.log('🎉 Manufacturer data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during manufacturer seeding:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('❌ Failed to seed manufacturer data:', error);
  process.exit(1);
});
