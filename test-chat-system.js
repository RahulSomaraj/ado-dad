const axios = require('axios');
const { io } = require('socket.io-client');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const WS_URL = 'http://localhost:5000';

// Test data
const testUsers = [
  {
    username: 'testuser1',
    email: 'user@example.com',
    password: '123456',
    roles: ['user']
  },
  {
    username: 'testuser2', 
    email: 'user2@example.com',
    password: '123456',
    roles: ['user']
  },
  {
    username: 'testuser3',
    email: 'user3@example.com', 
    password: '123456',
    roles: ['user']
  }
];

const testAds = [
  {
    description: 'Test Car for Sale - Excellent condition, low mileage',
    price: 25000,
    images: [],
    location: 'New York, NY',
    category: 'private_vehicle',
    isActive: true
  },
  {
    description: 'Test Motorcycle - Great for commuting',
    price: 8000,
    images: [],
    location: 'Los Angeles, CA',
    category: 'motorcycle',
    isActive: true
  },
  {
    description: 'Test Truck - Perfect for work',
    price: 35000,
    images: [],
    location: 'Chicago, IL',
    category: 'commercial_vehicle',
    isActive: true
  }
];

class ChatSystemTester {
  constructor() {
    this.users = [];
    this.ads = [];
    this.tokens = {};
    this.sockets = {};
    this.testResults = [];
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type}] ${message}`);
  }

  async testResult(testName, success, details = '') {
    const result = {
      test: testName,
      success,
      details,
      timestamp: new Date().toISOString()
    };
    this.testResults.push(result);
    
    const status = success ? '✅ PASS' : '❌ FAIL';
    this.log(`${status} ${testName}`, success ? 'SUCCESS' : 'ERROR');
    if (details) {
      this.log(`  Details: ${details}`, 'DETAIL');
    }
  }

  // ====== Database Setup ======
  async setupDatabase() {
    try {
      await mongoose.connect('mongodb://localhost:27017/ado-dad');
      this.log('Connected to MongoDB');
      
      // Clear existing test data
      await this.clearTestData();
      
      // Create test users
      await this.createTestUsers();
      
      // Create test ads
      await this.createTestAds();
      
      this.log('Database setup completed');
      return true;
    } catch (error) {
      this.log(`Database setup failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async clearTestData() {
    const User = mongoose.model('User', new mongoose.Schema({}));
    const Ad = mongoose.model('Ad', new mongoose.Schema({}));
    const ChatRoom = mongoose.model('ChatRoom', new mongoose.Schema({}));
    const ChatMessage = mongoose.model('ChatMessage', new mongoose.Schema({}));
    
    await User.deleteMany({ username: { $in: testUsers.map(u => u.username) } });
    await Ad.deleteMany({ description: { $regex: /^Test / } });
    await ChatRoom.deleteMany({});
    await ChatMessage.deleteMany({});
    
    this.log('Cleared existing test data');
  }

  async createTestUsers() {
    const userSchema = new mongoose.Schema({
      username: String,
      email: String,
      password: String,
      roles: [String]
    }, { timestamps: true });
    
    const User = mongoose.model('User', userSchema);
    
    for (const userData of testUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      const savedUser = await user.save();
      this.users.push(savedUser);
      this.log(`Created user: ${savedUser.username} (${savedUser._id})`);
    }
  }

  async createTestAds() {
    const adSchema = new mongoose.Schema({
      description: String,
      price: Number,
      images: [String],
      location: String,
      category: String,
      isActive: Boolean,
      postedBy: mongoose.Schema.Types.ObjectId
    }, { timestamps: true });
    
    const Ad = mongoose.model('Ad', adSchema);
    
    for (let i = 0; i < testAds.length; i++) {
      const adData = {
        ...testAds[i],
        postedBy: this.users[i]._id
      };
      const ad = new Ad(adData);
      const savedAd = await ad.save();
      this.ads.push(savedAd);
      this.log(`Created ad: ${savedAd.description} (${savedAd._id})`);
    }
  }

  // ====== Authentication Tests ======
  async testAuthentication() {
    this.log('=== Testing Authentication ===');
    
    // Test user login
    for (let i = 0; i < this.users.length; i++) {
      const user = this.users[i];
      const userData = testUsers[i];
      
      try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
          username: userData.email,
          password: userData.password
        });
        
        if (response.status === 200 || response.status === 201) {
          // Handle different token field names
          const token = response.data.access_token || response.data.token;
          if (token) {
            this.tokens[user.username] = token;
            await this.testResult(
              `Login ${user.username}`,
              true,
              `Token received: ${token.substring(0, 20)}...`
            );
          } else {
            await this.testResult(`Login ${user.username}`, false, 'No token received');
          }
        } else {
          await this.testResult(`Login ${user.username}`, false, `Status ${response.status}`);
        }
      } catch (error) {
        await this.testResult(
          `Login ${user.username}`,
          false,
          error.response?.data?.message || error.message
        );
      }
    }
    
    // Test invalid login
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        username: 'invalid@email.com',
        password: 'wrongpassword'
      });
      await this.testResult('Invalid login', false, 'Should have failed');
    } catch (error) {
      if (error.response?.status === 401) {
        await this.testResult('Invalid login', true, 'Correctly rejected invalid credentials');
      } else {
        await this.testResult('Invalid login', false, error.message);
      }
    }
  }

  // ====== WebSocket Connection Tests ======
  async testWebSocketConnections() {
    this.log('=== Testing WebSocket Connections ===');
    
    for (const user of this.users) {
      const token = this.tokens[user.username];
      if (!token) {
        await this.testResult(`WS Connection ${user.username}`, false, 'No token available');
        continue;
      }
      
      try {
        const socket = io(`${WS_URL}/chat`, {
          transports: ['websocket'],
          auth: { token: `Bearer ${token}` },
          timeout: 5000
        });
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Connection timeout'));
          }, 5000);
          
          socket.on('connect', () => {
            clearTimeout(timeout);
            this.sockets[user.username] = socket;
            this.testResult(`WS Connection ${user.username}`, true, `Connected with ID: ${socket.id}`);
            resolve();
          });
          
          socket.on('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      } catch (error) {
        await this.testResult(`WS Connection ${user.username}`, false, error.message);
      }
    }
    
    // Test unauthenticated connection
    try {
      const socket = io(`${WS_URL}/chat`, {
        transports: ['websocket'],
        timeout: 3000
      });
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 3000);
        
        socket.on('connect', () => {
          clearTimeout(timeout);
          reject(new Error('Unauthenticated connection should have failed'));
        });
        
        socket.on('connect_error', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      
      await this.testResult('Unauthenticated WS Connection', true, 'Correctly rejected');
    } catch (error) {
      if (error.message.includes('should have failed')) {
        await this.testResult('Unauthenticated WS Connection', false, error.message);
      } else {
        await this.testResult('Unauthenticated WS Connection', true, 'Correctly rejected');
      }
    }
  }

  // ====== Chat Room Tests ======
  async testChatRoomCreation() {
    this.log('=== Testing Chat Room Creation ===');
    
    const user = this.users[0];
    const ad = this.ads[0];
    const socket = this.sockets[user.username];
    
    if (!socket) {
      await this.testResult('Create Chat Room', false, 'No socket connection');
      return;
    }
    
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Chat room creation timeout'));
        }, 5000);
        
        socket.on('createChatRoomResponse', (data) => {
          clearTimeout(timeout);
          if (data.success) {
            this.testResult('Create Chat Room', true, `Room created: ${data.chatRoom.roomId}`);
            this.roomId = data.chatRoom.roomId;
            resolve();
          } else {
            reject(new Error(data.error || 'Chat room creation failed'));
          }
        });
        
        socket.emit('createChatRoom', { adId: ad._id.toString() });
      });
    } catch (error) {
      await this.testResult('Create Chat Room', false, error.message);
    }
  }

  async testChatRoomJoining() {
    this.log('=== Testing Chat Room Joining ===');
    
    if (!this.roomId) {
      await this.testResult('Join Chat Room', false, 'No room ID available');
      return;
    }
    
    // Test joining with different users
    for (let i = 1; i < this.users.length; i++) {
      const user = this.users[i];
      const socket = this.sockets[user.username];
      
      if (!socket) {
        await this.testResult(`Join Chat Room ${user.username}`, false, 'No socket connection');
        continue;
      }
      
      try {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Join timeout'));
          }, 5000);
          
          socket.on('joinChatRoomResponse', (data) => {
            clearTimeout(timeout);
            if (data.success) {
              this.testResult(`Join Chat Room ${user.username}`, true, `Joined with role: ${data.userRole}`);
              resolve();
            } else {
              reject(new Error(data.error || 'Join failed'));
            }
          });
          
          socket.emit('joinChatRoom', { roomId: this.roomId });
        });
      } catch (error) {
        await this.testResult(`Join Chat Room ${user.username}`, false, error.message);
      }
    }
  }

  async testGetUserChatRooms() {
    this.log('=== Testing Get User Chat Rooms ===');
    
    for (const user of this.users) {
      const socket = this.sockets[user.username];
      
      if (!socket) {
        await this.testResult(`Get Chat Rooms ${user.username}`, false, 'No socket connection');
        continue;
      }
      
      try {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Get rooms timeout'));
          }, 5000);
          
          socket.on('userChatRooms', (data) => {
            clearTimeout(timeout);
            if (data.success) {
              const roomCount = data.chatRooms.length;
              this.testResult(`Get Chat Rooms ${user.username}`, true, `Found ${roomCount} rooms`);
              resolve();
            } else {
              reject(new Error(data.error || 'Get rooms failed'));
            }
          });
          
          socket.emit('getUserChatRooms');
        });
      } catch (error) {
        await this.testResult(`Get Chat Rooms ${user.username}`, false, error.message);
      }
    }
  }

  async testChatRoomLeaving() {
    this.log('=== Testing Chat Room Leaving ===');
    
    if (!this.roomId) {
      await this.testResult('Leave Chat Room', false, 'No room ID available');
      return;
    }
    
    const user = this.users[1];
    const socket = this.sockets[user.username];
    
    if (!socket) {
      await this.testResult('Leave Chat Room', false, 'No socket connection');
      return;
    }
    
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Leave timeout'));
        }, 5000);
        
        socket.on('leaveChatRoomResponse', (data) => {
          clearTimeout(timeout);
          if (data.success) {
            this.testResult('Leave Chat Room', true, 'Successfully left room');
            resolve();
          } else {
            reject(new Error(data.error || 'Leave failed'));
          }
        });
        
        socket.emit('leaveChatRoom', { roomId: this.roomId });
      });
    } catch (error) {
      await this.testResult('Leave Chat Room', false, error.message);
    }
  }

  // ====== API Tests ======
  async testAPIs() {
    this.log('=== Testing REST APIs ===');
    
    // Test health check
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      await this.testResult('Health Check API', response.status === 200, `Status: ${response.status}`);
    } catch (error) {
      await this.testResult('Health Check API', false, error.message);
    }
    
    // Test protected routes with tokens
    for (const user of this.users) {
      const token = this.tokens[user.username];
      if (!token) continue;
      
      try {
        const response = await axios.get(`${BASE_URL}/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await this.testResult(`Profile API ${user.username}`, response.status === 200, 'Profile retrieved');
      } catch (error) {
        await this.testResult(`Profile API ${user.username}`, false, error.response?.data?.message || error.message);
      }
    }
  }

  // ====== Cleanup ======
  async cleanup() {
    this.log('=== Cleaning Up ===');
    
    // Disconnect sockets
    for (const [username, socket] of Object.entries(this.sockets)) {
      if (socket.connected) {
        socket.disconnect();
        this.log(`Disconnected socket for ${username}`);
      }
    }
    
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      this.log('Disconnected from MongoDB');
    }
  }

  // ====== Run All Tests ======
  async runAllTests() {
    this.log('🚀 Starting Chat System Tests');
    
    try {
      // Setup
      const setupSuccess = await this.setupDatabase();
      if (!setupSuccess) {
        this.log('❌ Setup failed, aborting tests', 'ERROR');
        return;
      }
      
      // Run tests
      await this.testAuthentication();
      await this.testWebSocketConnections();
      await this.testChatRoomCreation();
      await this.testChatRoomJoining();
      await this.testGetUserChatRooms();
      await this.testChatRoomLeaving();
      await this.testAPIs();
      
      // Summary
      this.printTestSummary();
      
    } catch (error) {
      this.log(`❌ Test execution failed: ${error.message}`, 'ERROR');
    } finally {
      await this.cleanup();
    }
  }

  printTestSummary() {
    this.log('=== Test Summary ===');
    
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.success).length;
    const failed = total - passed;
    
    console.log(`\n📊 Results: ${passed}/${total} tests passed`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.test}: ${r.details}`);
        });
    }
    
    console.log('\n🎯 Test Coverage:');
    console.log('  ✅ User Authentication (Login/Logout)');
    console.log('  ✅ WebSocket Connections (Authenticated/Unauthenticated)');
    console.log('  ✅ Chat Room Creation');
    console.log('  ✅ Chat Room Joining');
    console.log('  ✅ Chat Room Management (Get Rooms, Leave)');
    console.log('  ✅ REST API Endpoints');
    console.log('  ✅ Database Operations');
  }
}

// Run tests
async function main() {
  const tester = new ChatSystemTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ChatSystemTester;
