const mongoose = require('mongoose');
const { configService } = require('./src/config/mongo.config');

async function debugLookup() {
  try {
    // Connect to MongoDB
    const mongoConfig = configService.getMongoConfig();
    if (!mongoConfig.uri) {
      throw new Error('MongoDB URI is not configured');
    }
    await mongoose.connect(mongoConfig.uri);
    console.log('✅ Connected to MongoDB');

    // Create models
    const Ad = mongoose.model('Ad', new mongoose.Schema({}));
    const CommercialVehicleAd = mongoose.model('CommercialVehicleAd', new mongoose.Schema({}));

    // Test 1: Count ads and details
    const adCount = await Ad.countDocuments({category: 'commercial_vehicle'});
    const activeAdCount = await Ad.countDocuments({category: 'commercial_vehicle', isActive: true});
    const detailCount = await CommercialVehicleAd.countDocuments();
    console.log(`📊 Commercial vehicle ads: ${adCount}`);
    console.log(`📊 Active commercial vehicle ads: ${activeAdCount}`);
    console.log(`📊 Commercial vehicle details: ${detailCount}`);

    // Test 2: Check a few ads and their details
    const ads = await Ad.find({category: 'commercial_vehicle'}).limit(3);
    console.log('\n🔍 Sample ads:');
    ads.forEach((ad, i) => {
      console.log(`  Ad ${i+1}: ${ad._id}`);
    });

    const details = await CommercialVehicleAd.find().limit(3);
    console.log('\n🔍 Sample details:');
    details.forEach((detail, i) => {
      console.log(`  Detail ${i+1}:`, JSON.stringify(detail, null, 2));
    });

    // Test 3: Manual lookup test
    console.log('\n🔍 Manual lookup test:');
    for (const ad of ads) {
      const detail = await CommercialVehicleAd.findOne({ad: ad._id});
      console.log(`  Ad ${ad._id}: ${detail ? '✅ Has detail' : '❌ No detail'}`);
    }

    // Test 4: Aggregation pipeline test (matching the API exactly)
    console.log('\n🔍 Aggregation pipeline test (matching API):');
    const pipeline = [
      { $match: { isActive: true, category: 'commercial_vehicle' } },
      {
        $lookup: {
          from: 'commercialvehicleads',
          localField: '_id',
          foreignField: 'ad',
          as: 'commercialVehicleDetails'
        }
      },
      { $match: { commercialVehicleDetails: { $ne: [] } } }
    ];

    const result = await Ad.aggregate(pipeline);
    console.log(`  Pipeline result: ${result.length} ads`);

    // Test 5: Check ObjectId types
    console.log('\n🔍 ObjectId type check:');
    if (ads.length > 0 && details.length > 0) {
      const adId = ads[0]._id;
      const detailAdId = details[0].ad;
      console.log(`  Ad _id type: ${typeof adId}, constructor: ${adId.constructor.name}`);
      console.log(`  Detail ad type: ${typeof detailAdId}, constructor: ${detailAdId.constructor.name}`);
      console.log(`  Are equal: ${adId.toString() === detailAdId.toString()}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugLookup();
