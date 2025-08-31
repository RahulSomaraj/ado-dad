const mongoose = require('mongoose');

async function checkAds() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ado-dad');
    console.log('Connected to MongoDB');
    
    const Ad = mongoose.model('Ad', new mongoose.Schema({}));
    const ads = await Ad.find({}).limit(10).select('_id description price location');
    
    console.log('\n=== Available Ads ===');
    if (ads.length === 0) {
      console.log('No ads found in database');
    } else {
      ads.forEach((ad, index) => {
        console.log(`${index + 1}. ID: ${ad._id}`);
        console.log(`   Description: ${ad.description?.substring(0, 60)}...`);
        console.log(`   Price: ${ad.price}`);
        console.log(`   Location: ${ad.location}`);
        console.log('');
      });
    }
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAds();
