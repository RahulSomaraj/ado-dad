import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { AdsSeedService } from './seed-ads-data';

async function runSeed() {
  console.log('🚀 Starting Ads data seeding process...');

  try {
    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule);

    // Get the seed service
    const adsSeedService = app.get(AdsSeedService);

    // Run the seeding
    await adsSeedService.seedAdsData();

    console.log('🎉 Ads data seeding completed successfully!');
    console.log('📊 Summary:');
    console.log('   - 5 Property ads');
    console.log('   - 4 Vehicle ads');
    console.log('   - 3 Commercial Vehicle ads');
    console.log('   - 4 Two-wheeler ads');
    console.log('   - Total: 16 advertisements');

    // Close the application
    await app.close();

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

// Run the seed function
runSeed();
