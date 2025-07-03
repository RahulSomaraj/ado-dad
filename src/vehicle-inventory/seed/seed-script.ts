import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SeedDataService } from './seed-data';

async function bootstrap() {
  console.log('🚀 Starting seed data population...');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const seedService = app.get(SeedDataService);
    await seedService.seedAll();
    console.log('✅ Seed data population completed successfully!');
  } catch (error) {
    console.error('❌ Error during seed data population:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
