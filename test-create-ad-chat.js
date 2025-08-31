const io = require('socket.io-client');
const axios = require('axios');

// Configuration
const SERVER_URL = 'http://localhost:5000';
const TEST_USER = {
  username: 'user@example.com',
  password: '123456'
};

// Test data
let authToken = '';
let testAdId = '';

async function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function getAuthToken() {
  try {
    log('🔐 Getting authentication token...');
    const response = await axios.post(`${SERVER_URL}/auth/login`, TEST_USER);
    authToken = response.data.token;
    log(`✅ Token obtained: ${authToken.substring(0, 50)}...`);
    return authToken;
  } catch (error) {
    log(`❌ Failed to get auth token: ${error.message}`);
    throw error;
  }
}

async function getTestAd() {
  try {
    log('📋 Getting test ad...');
    const response = await axios.post(`${SERVER_URL}/ads/list`, {
      page: 1,
      limit: 1
    });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      testAdId = response.data.data[0]._id;
      log(`✅ Test ad found: ${testAdId}`);
      return testAdId;
    } else {
      throw new Error('No ads found in database');
    }
  } catch (error) {
    log(`❌ Failed to get test ad: ${error.message}`);
    throw error;
  }
}

async function testRestApiCreateAdChat() {
  try {
    log('🌐 Testing REST API createAdChat...');
    
    const response = await axios.post(
      `${SERVER_URL}/chat/ad/${testAdId}`,
      {},
      {
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        }
      }
    );
    
    log(`✅ REST API createAdChat successful:`);
    log(`   Chat ID: ${response.data.chat._id}`);
    log(`   Ad Poster ID: ${response.data.adPosterId}`);
    log(`   Viewer ID: ${response.data.viewerId}`);
    log(`   Is New Chat: ${response.data.isNewChat}`);
    
    return response.data;
  } catch (error) {
    log(`❌ REST API createAdChat failed: ${error.message}`);
    if (error.response) {
      log(`   Status: ${error.response.status}`);
      log(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

async function testWebSocketCreateAdChat() {
  return new Promise((resolve, reject) => {
    log('🔌 Testing WebSocket createAdChat...');
    
    const socket = io(`${SERVER_URL}/chat`, {
      transports: ['websocket'],
      auth: {
        token: authToken
      },
      autoConnect: false
    });

    socket.on('connect', () => {
      log('✅ WebSocket connected');
      
      socket.emit('createAdChat', { adId: testAdId }, (response) => {
        if (response.success) {
          log(`✅ WebSocket createAdChat successful:`);
          log(`   Chat ID: ${response.chat._id}`);
          log(`   Ad Poster ID: ${response.adPosterId}`);
          log(`   Viewer ID: ${response.viewerId}`);
          log(`   Is New Chat: ${response.isNewChat}`);
          
          socket.disconnect();
          resolve(response);
        } else {
          log(`❌ WebSocket createAdChat failed: ${response.error}`);
          socket.disconnect();
          reject(new Error(response.error));
        }
      });
    });

    socket.on('connect_error', (error) => {
      log(`❌ WebSocket connection failed: ${error.message}`);
      reject(error);
    });

    socket.on('disconnect', (reason) => {
      log(`🔌 WebSocket disconnected: ${reason}`);
    });

    socket.connect();
  });
}

async function testGetUserChats() {
  try {
    log('📋 Testing getUserChats...');
    
    const response = await axios.get(
      `${SERVER_URL}/chat/user`,
      {
        headers: {
          'Authorization': authToken
        }
      }
    );
    
    log(`✅ getUserChats successful: ${response.data.chats.length} chats found`);
    response.data.chats.forEach((chat, index) => {
      log(`   Chat ${index + 1}: ${chat._id} (${chat.contextType})`);
    });
    
    return response.data;
  } catch (error) {
    log(`❌ getUserChats failed: ${error.message}`);
    throw error;
  }
}

async function runTests() {
  try {
    log('🚀 Starting createAdChat tests...');
    
    // Step 1: Get authentication token
    await getAuthToken();
    
    // Step 2: Get a test ad
    await getTestAd();
    
    // Step 3: Test REST API
    await testRestApiCreateAdChat();
    
    // Step 4: Test WebSocket
    await testWebSocketCreateAdChat();
    
    // Step 5: Test getUserChats
    await testGetUserChats();
    
    log('🎉 All tests completed successfully!');
    
  } catch (error) {
    log(`💥 Test suite failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the tests
runTests();
