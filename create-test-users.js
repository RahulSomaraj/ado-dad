const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Define User schema
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roles: { type: [String], default: ['user'] },
  },
  { timestamps: true },
);

async function createTestUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ado-dad');
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', userSchema);

    // Check if users already exist
    const existingUser1 = await User.findOne({ email: 'user@example.com' });
    const existingUser2 = await User.findOne({ email: 'user2@example.com' });

    if (existingUser1) {
      console.log('User 1 already exists:', existingUser1._id);
    } else {
      // Create test user 1
      const hashedPassword1 = await bcrypt.hash('123456', 10);
      const user1 = new User({
        username: 'testuser1',
        email: 'user@example.com',
        password: hashedPassword1,
        roles: ['user'],
      });

      const savedUser1 = await user1.save();
      console.log('Created User 1:', savedUser1._id);
    }

    if (existingUser2) {
      console.log('User 2 already exists:', existingUser2._id);
    } else {
      // Create test user 2
      const hashedPassword2 = await bcrypt.hash('123456', 10);
      const user2 = new User({
        username: 'testuser2',
        email: 'user2@example.com',
        password: hashedPassword2,
        roles: ['user'],
      });

      const savedUser2 = await user2.save();
      console.log('Created User 2:', savedUser2._id);
    }

    console.log('\n=== Test Users Ready ===');
    console.log('User 1: user@example.com / 123456');
    console.log('User 2: user2@example.com / 123456');
    console.log('\nUse these credentials to login in the chat test interface!');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createTestUsers();
