import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SafeManufacturerSeedService } from './safe-seed-manufacturers';

async function bootstrap() {
  console.log('🚀 Starting Safe Manufacturer data seeding process...');
  console.log('🛡️ Using Test Data Safety Framework for secure seeding...');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const safeManufacturerSeedService = app.get(SafeManufacturerSeedService);

    // Seed manufacturers safely
    await safeManufacturerSeedService.seedManufacturers();

    // Validate data integrity
    const integrityCheck =
      await safeManufacturerSeedService.validateManufacturerIntegrity();

    if (integrityCheck) {
      // Get summary
      const count =
        await safeManufacturerSeedService.getSeededManufacturerCount();
      const manufacturers =
        await safeManufacturerSeedService.listSeededManufacturers();

      console.log('🎉 Safe Manufacturer data seeding completed successfully!');
      console.log('📊 Summary:');
      console.log(`   - Total manufacturers seeded: ${count}`);
      console.log(`   - All data has safety markers`);
      console.log(`   - Data is tracked for safe cleanup`);
      console.log(`   - Environment validated`);
      console.log(`   - All operations audited`);

      // Show sample manufacturers
      console.log('\n🏭 Sample Manufacturers:');
      manufacturers.slice(0, 5).forEach((mfr) => {
        console.log(`   • ${mfr.displayName} (${mfr.originCountry})`);
      });

      if (manufacturers.length > 5) {
        console.log(`   ... and ${manufacturers.length - 5} more`);
      }

      console.log('\n🛡️ Safety Features:');
      console.log('   ✅ Test data markers applied');
      console.log('   ✅ Data registered for tracking');
      console.log('   ✅ Safe cleanup methods available');
      console.log('   ✅ Environment validation passed');
      console.log('   ✅ All operations logged for audit');
    } else {
      console.error('❌ Manufacturer integrity check failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during safe manufacturer seeding:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Safe manufacturer seeding interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Safe manufacturer seeding terminated');
  process.exit(0);
});

bootstrap().catch((error) => {
  console.error('❌ Failed to run safe manufacturer seeding:', error);
  process.exit(1);
});
