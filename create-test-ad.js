const mongoose = require('mongoose');

// Define the Ad schema
const adSchema = new mongoose.Schema({
  description: String,
  price: Number,
  images: [String],
  location: String,
  category: String,
  isActive: Boolean,
  postedBy: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

async function createTestAd() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ado-dad');
    console.log('Connected to MongoDB');
    
    const Ad = mongoose.model('Ad', adSchema);
    
    // Create a test ad
    const testAd = new Ad({
      description: 'Test Car for Sale - Excellent condition, low mileage',
      price: 25000,
      images: [],
      location: 'New York, NY',
      category: 'private_vehicle',
      isActive: true,
      postedBy: new mongoose.Types.ObjectId() // Create a dummy user ID
    });
    
    const savedAd = await testAd.save();
    console.log('\n=== Test Ad Created ===');
    console.log(`ID: ${savedAd._id}`);
    console.log(`Description: ${savedAd.description}`);
    console.log(`Price: $${savedAd.price}`);
    console.log(`Location: ${savedAd.location}`);
    console.log(`Active: ${savedAd.isActive}`);
    console.log('\nUse this ID in your chat room test!');
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createTestAd();
