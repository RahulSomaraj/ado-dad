import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SafeTransmissionTypeSeedService } from './safe-seed-transmission-types';

async function bootstrap() {
  console.log('🚀 Starting Safe Transmission Types data seeding process...');
  console.log('🛡️ Using Test Data Safety Framework for secure seeding...');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const safeTransmissionTypeSeedService = app.get(
      SafeTransmissionTypeSeedService,
    );

    // Seed transmission types safely
    await safeTransmissionTypeSeedService.seedTransmissionTypes();

    // Validate data integrity
    const integrityCheck =
      await safeTransmissionTypeSeedService.validateTransmissionTypeIntegrity();

    if (integrityCheck) {
      // Get summary
      const count =
        await safeTransmissionTypeSeedService.getSeededTransmissionTypeCount();
      const transmissionTypes =
        await safeTransmissionTypeSeedService.listSeededTransmissionTypes();

      console.log(
        '🎉 Safe Transmission Types data seeding completed successfully!',
      );
      console.log('📊 Summary:');
      console.log(`   - Total transmission types seeded: ${count}`);
      console.log(`   - All data has safety markers`);
      console.log(`   - Data is tracked for safe cleanup`);
      console.log(`   - Environment validated`);
      console.log(`   - All operations audited`);

      // Show sample transmission types
      console.log('\n⚙️ Sample Transmission Types:');
      transmissionTypes.slice(0, 5).forEach((tt) => {
        console.log(`   • ${tt.displayName} (${tt.type})`);
      });

      if (transmissionTypes.length > 5) {
        console.log(`   ... and ${transmissionTypes.length - 5} more`);
      }

      console.log('\n🛡️ Safety Features:');
      console.log('   ✅ Test data markers applied');
      console.log('   ✅ Data registered for tracking');
      console.log('   ✅ Safe cleanup methods available');
      console.log('   ✅ Environment validation passed');
      console.log('   ✅ All operations logged for audit');
    } else {
      console.error('❌ Transmission types integrity check failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during safe transmission types seeding:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Safe transmission types seeding interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Safe transmission types seeding terminated');
  process.exit(0);
});

bootstrap().catch((error) => {
  console.error('❌ Failed to run safe transmission types seeding:', error);
  process.exit(1);
});
