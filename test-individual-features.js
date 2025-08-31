const axios = require('axios');
const { io } = require('socket.io-client');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const WS_URL = 'http://localhost:5000';

// Test credentials
const TEST_USERS = [
  { email: 'user@example.com', password: '123456' },
  { email: 'user2@example.com', password: '123456' }
];

class IndividualFeatureTester {
  constructor() {
    this.tokens = {};
    this.sockets = {};
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [${type}] ${message}`);
  }

  // ====== Authentication Tests ======
  async testLogin() {
    this.log('=== Testing Login ===');
    
    for (let i = 0; i < TEST_USERS.length; i++) {
      const user = TEST_USERS[i];
      try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
          username: user.email,
          password: user.password
        });
        
        if (response.status === 200 || response.status === 201) {
          // Handle different token field names
          const token = response.data.access_token || response.data.token;
          if (token) {
            this.tokens[user.email] = token;
            this.log(`✅ Login successful for ${user.email}`);
            this.log(`   Token: ${token.substring(0, 30)}...`);
          } else {
            this.log(`❌ Login failed for ${user.email}: No token received`);
            this.log(`   Response: ${JSON.stringify(response.data)}`);
          }
        } else {
          this.log(`❌ Login failed for ${user.email}: Status ${response.status}`);
        }
      } catch (error) {
        this.log(`❌ Login failed for ${user.email}: ${error.response?.data?.message || error.message}`);
      }
    }
  }

  async testInvalidLogin() {
    this.log('=== Testing Invalid Login ===');
    
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        username: 'invalid@email.com',
        password: 'wrongpassword'
      });
      this.log('❌ Invalid login should have failed');
    } catch (error) {
      if (error.response?.status === 401) {
        this.log('✅ Invalid login correctly rejected');
      } else {
        this.log(`❌ Unexpected error: ${error.message}`);
      }
    }
  }

  // ====== WebSocket Connection Tests ======
  async testWebSocketConnection() {
    this.log('=== Testing WebSocket Connection ===');
    
    for (const [email, token] of Object.entries(this.tokens)) {
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
            this.sockets[email] = socket;
            this.log(`✅ WebSocket connected for ${email} (ID: ${socket.id})`);
            resolve();
          });
          
          socket.on('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      } catch (error) {
        this.log(`❌ WebSocket connection failed for ${email}: ${error.message}`);
      }
    }
  }

  async testUnauthenticatedWebSocket() {
    this.log('=== Testing Unauthenticated WebSocket ===');
    
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
      
      this.log('✅ Unauthenticated WebSocket correctly rejected');
    } catch (error) {
      if (error.message.includes('should have failed')) {
        this.log('❌ Unauthenticated WebSocket should have been rejected');
      } else {
        this.log('✅ Unauthenticated WebSocket correctly rejected');
      }
    }
  }

  // ====== Chat Room Tests ======
  async testChatRoomCreation() {
    this.log('=== Testing Chat Room Creation ===');
    
    const email = Object.keys(this.tokens)[0];
    const socket = this.sockets[email];
    
    if (!socket) {
      this.log('❌ No socket connection available');
      return;
    }
    
    // Use a test ad ID (you can replace this with a real ad ID from your database)
    const testAdId = '507f1f77bcf86cd799439011';
    
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Chat room creation timeout'));
        }, 5000);
        
        socket.on('createChatRoomResponse', (data) => {
          clearTimeout(timeout);
          if (data.success) {
            this.log(`✅ Chat room created: ${data.chatRoom.roomId}`);
            this.roomId = data.chatRoom.roomId;
            resolve();
          } else {
            reject(new Error(data.error || 'Chat room creation failed'));
          }
        });
        
        socket.emit('createChatRoom', { adId: testAdId });
      });
    } catch (error) {
      this.log(`❌ Chat room creation failed: ${error.message}`);
    }
  }

  async testChatRoomJoining() {
    this.log('=== Testing Chat Room Joining ===');
    
    if (!this.roomId) {
      this.log('❌ No room ID available');
      return;
    }
    
    const emails = Object.keys(this.sockets);
    for (let i = 1; i < emails.length; i++) {
      const email = emails[i];
      const socket = this.sockets[email];
      
      try {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Join timeout'));
          }, 5000);
          
          socket.on('joinChatRoomResponse', (data) => {
            clearTimeout(timeout);
            if (data.success) {
              this.log(`✅ ${email} joined room with role: ${data.userRole}`);
              resolve();
            } else {
              reject(new Error(data.error || 'Join failed'));
            }
          });
          
          socket.emit('joinChatRoom', { roomId: this.roomId });
        });
      } catch (error) {
        this.log(`❌ ${email} failed to join room: ${error.message}`);
      }
    }
  }

  async testGetUserChatRooms() {
    this.log('=== Testing Get User Chat Rooms ===');
    
    for (const [email, socket] of Object.entries(this.sockets)) {
      try {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Get rooms timeout'));
          }, 5000);
          
          socket.on('userChatRooms', (data) => {
            clearTimeout(timeout);
            if (data.success) {
              const roomCount = data.chatRooms.length;
              this.log(`✅ ${email} has ${roomCount} chat rooms`);
              resolve();
            } else {
              reject(new Error(data.error || 'Get rooms failed'));
            }
          });
          
          socket.emit('getUserChatRooms');
        });
      } catch (error) {
        this.log(`❌ Failed to get chat rooms for ${email}: ${error.message}`);
      }
    }
  }

  // ====== API Tests ======
  async testHealthCheck() {
    this.log('=== Testing Health Check API ===');
    
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      this.log(`✅ Health check passed: ${response.status}`);
    } catch (error) {
      this.log(`❌ Health check failed: ${error.message}`);
    }
  }

  async testProtectedAPIs() {
    this.log('=== Testing Protected APIs ===');
    
    for (const [email, token] of Object.entries(this.tokens)) {
      try {
        const response = await axios.get(`${BASE_URL}/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        this.log(`✅ Profile API works for ${email}`);
      } catch (error) {
        this.log(`❌ Profile API failed for ${email}: ${error.response?.data?.message || error.message}`);
      }
    }
  }

  // ====== Cleanup ======
  async cleanup() {
    this.log('=== Cleaning Up ===');
    
    for (const [email, socket] of Object.entries(this.sockets)) {
      if (socket.connected) {
        socket.disconnect();
        this.log(`Disconnected socket for ${email}`);
      }
    }
  }

  // ====== Run All Tests ======
  async runAllTests() {
    this.log('🚀 Starting Individual Feature Tests');
    
    try {
      await this.testLogin();
      await this.testInvalidLogin();
      await this.testWebSocketConnection();
      await this.testUnauthenticatedWebSocket();
      await this.testChatRoomCreation();
      await this.testChatRoomJoining();
      await this.testGetUserChatRooms();
      await this.testHealthCheck();
      await this.testProtectedAPIs();
      
      this.log('✅ All tests completed');
    } catch (error) {
      this.log(`❌ Test execution failed: ${error.message}`);
    } finally {
      await this.cleanup();
    }
  }
}

// Individual test functions
async function testLoginOnly() {
  const tester = new IndividualFeatureTester();
  await tester.testLogin();
  await tester.testInvalidLogin();
}

async function testWebSocketOnly() {
  const tester = new IndividualFeatureTester();
  await tester.testLogin();
  await tester.testWebSocketConnection();
  await tester.testUnauthenticatedWebSocket();
  await tester.cleanup();
}

async function testChatRoomsOnly() {
  const tester = new IndividualFeatureTester();
  await tester.testLogin();
  await tester.testWebSocketConnection();
  await tester.testChatRoomCreation();
  await tester.testChatRoomJoining();
  await tester.testGetUserChatRooms();
  await tester.cleanup();
}

async function testAPIsOnly() {
  const tester = new IndividualFeatureTester();
  await tester.testLogin();
  await tester.testHealthCheck();
  await tester.testProtectedAPIs();
}

// Run specific tests based on command line argument
const testType = process.argv[2];

switch (testType) {
  case 'login':
    testLoginOnly();
    break;
  case 'websocket':
    testWebSocketOnly();
    break;
  case 'chatrooms':
    testChatRoomsOnly();
    break;
  case 'apis':
    testAPIsOnly();
    break;
  default:
    const tester = new IndividualFeatureTester();
    tester.runAllTests();
}

module.exports = IndividualFeatureTester;
