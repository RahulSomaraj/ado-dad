import mongoose from 'mongoose';
import { Ad, AdSchema } from '../schemas/ad.schema';
import { CommercialVehicleAd, CommercialVehicleAdSchema } from '../schemas/commercial-vehicle-ad.schema';
import { configService } from '../../config/mongo.config';

async function fixCommercialVehicleData() {
  try {
    // Connect to MongoDB using the same config as the main application
    const mongoConfig = configService.getMongoConfig();
    if (!mongoConfig.uri) {
      throw new Error('MongoDB URI is not configured');
    }
    await mongoose.connect(mongoConfig.uri);
    console.log('✅ Connected to MongoDB');

    // Create models
    const AdModel = mongoose.model(Ad.name, AdSchema);
    const CommercialVehicleAdModel = mongoose.model(CommercialVehicleAd.name, CommercialVehicleAdSchema);

    console.log('🔍 Starting commercial vehicle data fix...');

    // Find all commercial vehicle ads
    const commercialVehicleAds = await AdModel.find({
      category: 'commercial_vehicle',
    });

    console.log(`📊 Found ${commercialVehicleAds.length} commercial vehicle ads`);

    let fixedCount = 0;
    let deletedCount = 0;
    let errorCount = 0;

    for (const ad of commercialVehicleAds) {
      try {
        // Check if commercial vehicle details exist
        const existingDetails = await CommercialVehicleAdModel.findOne({
          ad: ad._id,
        });

        if (!existingDetails) {
          console.log(`❌ Ad ${ad._id} missing commercial vehicle details`);

          // Option 1: Create default details (if you want to keep the ad)
          // Option 2: Delete the orphaned ad (recommended for data integrity)
          
          // For now, let's delete orphaned ads to maintain data integrity
          await AdModel.findByIdAndDelete(ad._id);
          console.log(`🗑️  Deleted orphaned ad: ${ad._id}`);
          deletedCount++;

          /* 
          // Uncomment this section if you want to create default details instead
          const defaultDetails = new CommercialVehicleAdModel({
            ad: ad._id,
            commercialVehicleType: 'truck',
            bodyType: 'flatbed',
            manufacturerId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
            modelId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
            year: 2020,
            mileage: 50000,
            payloadCapacity: 5000,
            payloadUnit: 'kg',
            axleCount: 2,
            transmissionTypeId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439061'),
            fuelTypeId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439071'),
            color: 'White',
            hasInsurance: false,
            hasFitness: false,
            hasPermit: false,
            additionalFeatures: [],
            seatingCapacity: 2,
          });

          await defaultDetails.save();
          console.log(`✅ Created default details for ad: ${ad._id}`);
          fixedCount++;
          */
        } else {
          console.log(`✅ Ad ${ad._id} has proper details`);
        }
      } catch (error) {
        console.error(`❌ Error processing ad ${ad._id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Fix Summary:');
    console.log(`✅ Fixed: ${fixedCount} ads`);
    console.log(`🗑️  Deleted: ${deletedCount} orphaned ads`);
    console.log(`❌ Errors: ${errorCount} ads`);

    // Verify the fix
    const remainingAds = await AdModel.find({
      category: 'commercial_vehicle',
    });
    console.log(`📊 Remaining commercial vehicle ads: ${remainingAds.length}`);

    // Check if all remaining ads have details
    let orphanedCount = 0;
    for (const ad of remainingAds) {
      const details = await CommercialVehicleAdModel.findOne({
        ad: ad._id,
      });
      if (!details) {
        orphanedCount++;
      }
    }

    if (orphanedCount === 0) {
      console.log('✅ All commercial vehicle ads now have proper details!');
    } else {
      console.log(`❌ Still have ${orphanedCount} orphaned ads`);
    }

  } catch (error) {
    console.error('❌ Error during data fix:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixCommercialVehicleData()
    .then(() => {
      console.log('🎉 Commercial vehicle data fix completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Commercial vehicle data fix failed:', error);
      process.exit(1);
    });
}

export { fixCommercialVehicleData };
