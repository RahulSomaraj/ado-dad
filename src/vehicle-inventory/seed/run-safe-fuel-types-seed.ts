import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SafeFuelTypeSeedService } from './safe-seed-fuel-types';

async function bootstrap() {
  console.log('🚀 Starting Safe Fuel Types data seeding process...');
  console.log('🛡️ Using Test Data Safety Framework for secure seeding...');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const safeFuelTypeSeedService = app.get(SafeFuelTypeSeedService);

    // Seed fuel types safely
    await safeFuelTypeSeedService.seedFuelTypes();

    // Validate data integrity
    const integrityCheck =
      await safeFuelTypeSeedService.validateFuelTypeIntegrity();

    if (integrityCheck) {
      // Get summary
      const count = await safeFuelTypeSeedService.getSeededFuelTypeCount();
      const fuelTypes = await safeFuelTypeSeedService.listSeededFuelTypes();

      console.log('🎉 Safe Fuel Types data seeding completed successfully!');
      console.log('📊 Summary:');
      console.log(`   - Total fuel types seeded: ${count}`);
      console.log(`   - All data has safety markers`);
      console.log(`   - Data is tracked for safe cleanup`);
      console.log(`   - Environment validated`);
      console.log(`   - All operations audited`);

      // Show sample fuel types
      console.log('\n⛽ Sample Fuel Types:');
      fuelTypes.slice(0, 5).forEach((ft) => {
        console.log(`   • ${ft.displayName} (${ft.category})`);
      });

      if (fuelTypes.length > 5) {
        console.log(`   ... and ${fuelTypes.length - 5} more`);
      }

      console.log('\n🛡️ Safety Features:');
      console.log('   ✅ Test data markers applied');
      console.log('   ✅ Data registered for tracking');
      console.log('   ✅ Safe cleanup methods available');
      console.log('   ✅ Environment validation passed');
      console.log('   ✅ All operations logged for audit');
    } else {
      console.error('❌ Fuel types integrity check failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during safe fuel types seeding:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Safe fuel types seeding interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Safe fuel types seeding terminated');
  process.exit(0);
});

bootstrap().catch((error) => {
  console.error('❌ Failed to run safe fuel types seeding:', error);
  process.exit(1);
});
