import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SafeVehicleVariantSeedService } from './safe-seed-vehicle-variants';

async function bootstrap() {
  console.log('🚀 Starting Safe Vehicle Variants data seeding...');
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const svc = app.get(SafeVehicleVariantSeedService);
    await svc.seedVehicleVariants();
    const ok = await svc.validateVehicleVariantIntegrity();
    if (!ok) process.exit(1);
    const count = await svc.getSeededVehicleVariantCount();
    console.log(`🎉 Seeded vehicle variants: ${count}`);
  } catch (e) {
    console.error('❌ Error during variants seeding:', e);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap().catch((e) => {
  console.error('❌ Failed to run vehicle variants seeding:', e);
  process.exit(1);
});
