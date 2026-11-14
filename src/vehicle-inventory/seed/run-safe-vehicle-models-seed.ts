import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SafeVehicleModelSeedService } from './safe-seed-vehicle-models';

async function bootstrap() {
  console.log('🚀 Starting Safe Vehicle Models data seeding...');
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const svc = app.get(SafeVehicleModelSeedService);
    await svc.seedVehicleModels();
    const ok = await svc.validateVehicleModelIntegrity();
    if (!ok) process.exit(1);
    const count = await svc.getSeededVehicleModelCount();
    console.log(`🎉 Seeded vehicle models: ${count}`);
  } catch (e) {
    console.error('❌ Error during models seeding:', e);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap().catch((e) => {
  console.error('❌ Failed to run vehicle models seeding:', e);
  process.exit(1);
});
