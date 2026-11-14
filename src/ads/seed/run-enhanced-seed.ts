import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { EnhancedAdsSeedService } from './enhanced-seed-ads';

async function runEnhancedSeed() {
  console.log('🚀 Starting Enhanced Ads data seeding process...');

  try {
    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule);

    // Get the enhanced seed service
    const enhancedAdsSeedService = app.get(EnhancedAdsSeedService);

    // Run the enhanced seeding
    await enhancedAdsSeedService.seedEnhancedAdsData();

    console.log('🎉 Enhanced Ads data seeding completed successfully!');
    console.log('📊 Summary:');
    console.log('   - 10 Property ads with specific images');
    console.log('   - 10 Bike ads with vehicle-specific images');
    console.log('   - 10 Car ads with vehicle-specific images');
    console.log('   - 10 Premium Car ads with luxury vehicle images');
    console.log('   - 10 Premium Vehicle ads with SUV images');
    console.log('   - Total: 50 advertisements');
    console.log('   - All images are specific to vehicle types');
    console.log('   - Expert testers/users as sellers');

    // Close the application
    await app.close();

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during enhanced seeding:', error);
    process.exit(1);
  }
}

// Run the enhanced seed function
runEnhancedSeed();
