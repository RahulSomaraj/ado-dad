const mongoose = require('mongoose');

// Define schemas
const userSchema = new mongoose.Schema(
  {
    username: String,
    email: String,
    password: String,
  },
  { timestamps: true },
);

const adSchema = new mongoose.Schema(
  {
    description: String,
    price: Number,
    images: [String],
    location: String,
    category: String,
    isActive: Boolean,
    postedBy: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true },
);

async function setupTestData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ado-dad');
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', userSchema);
    const Ad = mongoose.model('Ad', adSchema);

    // Create test users
    const user1 = new User({
      username: 'testuser1',
      email: 'user1@test.com',
      password: 'password123',
    });

    const user2 = new User({
      username: 'testuser2',
      email: 'user2@test.com',
      password: 'password123',
    });

    const savedUser1 = await user1.save();
    const savedUser2 = await user2.save();

    console.log('\n=== Test Users Created ===');
    console.log(`User 1 ID: ${savedUser1._id}`);
    console.log(`User 2 ID: ${savedUser2._id}`);

    // Create test ad
    const testAd = new Ad({
      description: 'Test Car for Sale - Excellent condition, low mileage',
      price: 25000,
      images: [],
      location: 'New York, NY',
      category: 'private_vehicle',
      isActive: true,
      postedBy: savedUser1._id,
    });

    const savedAd = await testAd.save();

    console.log('\n=== Test Ad Created ===');
    console.log(`Ad ID: ${savedAd._id}`);
    console.log(`Description: ${savedAd.description}`);
    console.log(`Posted by: ${savedAd.postedBy}`);

    console.log('\n=== Test Data Summary ===');
    console.log('Use these IDs in your chat room test:');
    console.log(`User 1 (Initiator): ${savedUser1._id}`);
    console.log(`User 2 (Receiver): ${savedUser2._id}`);
    console.log(`Ad ID: ${savedAd._id}`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

setupTestData();
