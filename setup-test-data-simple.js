const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Test data
const testUsers = [
  {
    username: 'testuser1',
    email: 'user@example.com',
    password: '123456',
    roles: ['user'],
  },
  {
    username: 'testuser2',
    email: 'user2@example.com',
    password: '123456',
    roles: ['user'],
  },
];

const testAds = [
  {
    description: 'Test Car for Sale - Excellent condition, low mileage',
    price: 25000,
    images: [],
    location: 'New York, NY',
    category: 'private_vehicle',
    isActive: true,
  },
  {
    description: 'Test Motorcycle - Great for commuting',
    price: 8000,
    images: [],
    location: 'Los Angeles, CA',
    category: 'motorcycle',
    isActive: true,
  },
];

async function setupTestData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ado-dad');
    console.log('✅ Connected to MongoDB');

    // Clear existing test data
    await clearTestData();

    // Create test users
    const users = await createTestUsers();

    // Create test ads
    const ads = await createTestAds(users);

    console.log('\n🎉 Test data setup completed!');
    console.log('\n📋 Test Users:');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} / 123456 (ID: ${user._id})`);
    });

    console.log('\n📋 Test Ads:');
    ads.forEach((ad, index) => {
      console.log(`  ${index + 1}. ${ad.description} (ID: ${ad._id})`);
    });

    console.log('\n🚀 Ready for testing!');
    console.log(
      '   Use these credentials in your test scripts and HTML interface.',
    );

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

async function clearTestData() {
  try {
    // Delete models if they exist to avoid compilation errors
    if (mongoose.models.User) {
      delete mongoose.models.User;
    }
    if (mongoose.models.Ad) {
      delete mongoose.models.Ad;
    }
    if (mongoose.models.ChatRoom) {
      delete mongoose.models.ChatRoom;
    }
    if (mongoose.models.ChatMessage) {
      delete mongoose.models.ChatMessage;
    }

    // Create temporary models for cleanup
    const User = mongoose.model('User', new mongoose.Schema({}));
    const Ad = mongoose.model('Ad', new mongoose.Schema({}));
    const ChatRoom = mongoose.model('ChatRoom', new mongoose.Schema({}));
    const ChatMessage = mongoose.model('ChatMessage', new mongoose.Schema({}));

    await User.deleteMany({
      username: { $in: testUsers.map((u) => u.username) },
    });
    await Ad.deleteMany({ description: { $regex: /^Test / } });
    await ChatRoom.deleteMany({});
    await ChatMessage.deleteMany({});

    console.log('🧹 Cleared existing test data');
  } catch (error) {
    console.log('⚠️  Cleanup warning:', error.message);
  }
}

async function createTestUsers() {
  // Delete existing model if it exists
  if (mongoose.models.User) {
    delete mongoose.models.User;
  }

  const userSchema = new mongoose.Schema(
    {
      username: String,
      email: String,
      password: String,
      roles: [String],
    },
    { timestamps: true },
  );

  const User = mongoose.model('User', userSchema);
  const users = [];

  for (const userData of testUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = new User({
      ...userData,
      password: hashedPassword,
    });
    const savedUser = await user.save();
    users.push(savedUser);
    console.log(`👤 Created user: ${savedUser.username}`);
  }

  return users;
}

async function createTestAds(users) {
  // Delete existing model if it exists
  if (mongoose.models.Ad) {
    delete mongoose.models.Ad;
  }

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

  const Ad = mongoose.model('Ad', adSchema);
  const ads = [];

  for (let i = 0; i < testAds.length; i++) {
    const adData = {
      ...testAds[i],
      postedBy: users[i]._id,
    };
    const ad = new Ad(adData);
    const savedAd = await ad.save();
    ads.push(savedAd);
    console.log(`📢 Created ad: ${savedAd.description}`);
  }

  return ads;
}

// Run setup
if (require.main === module) {
  setupTestData();
}

module.exports = { setupTestData, testUsers, testAds };
