import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SafeCommercialVehicleTypeSeedService } from './safe-seed-commercial-vehicle-types';

async function bootstrap() {
    console.log('🚀 Starting Safe Commercial Vehicle Types data seeding process...');
    console.log('🛡️ Using Test Data Safety Framework for secure seeding...');

    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        const safeSeedService = app.get(SafeCommercialVehicleTypeSeedService);

        await safeSeedService.seedCommercialVehicleTypes();

        const integrityCheck =
            await safeSeedService.validateCommercialVehicleTypeIntegrity();

        if (integrityCheck) {
            const count = await safeSeedService.getSeededCommercialVehicleTypeCount();
            const types = await safeSeedService.listSeededCommercialVehicleTypes();

            console.log('🎉 Safe Commercial Vehicle Types data seeding completed successfully!');
            console.log('📊 Summary:');
            console.log(`   - Total commercial vehicle types seeded: ${count}`);
            console.log(`   - All data has safety markers`);
            console.log(`   - Data is tracked for safe cleanup`);
            console.log(`   - Environment validated`);
            console.log(`   - All operations audited`);

            console.log('\n🚚 Sample Commercial Vehicle Types:');
            types.slice(0, 5).forEach((t) => {
                console.log(`   • ${t.displayName}`);
            });

            if (types.length > 5) {
                console.log(`   ... and ${types.length - 5} more`);
            }

            console.log('\n🛡️ Safety Features:');
            console.log('   ✅ Test data markers applied');
            console.log('   ✅ Data registered for tracking');
            console.log('   ✅ Safe cleanup methods available');
            console.log('   ✅ Environment validation passed');
            console.log('   ✅ All operations logged for audit');
        } else {
            console.error('❌ Commercial vehicle types integrity check failed!');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error during safe commercial vehicle types seeding:', error);
        process.exit(1);
    } finally {
        await app.close();
    }
}

process.on('SIGINT', () => {
    console.log('\n🛑 Safe commercial vehicle types seeding interrupted by user');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Safe commercial vehicle types seeding terminated');
    process.exit(0);
});

bootstrap().catch((error) => {
    console.error('❌ Failed to run safe commercial vehicle types seeding:', error);
    process.exit(1);
});
