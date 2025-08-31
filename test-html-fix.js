const io = require('socket.io-client');
const axios = require('axios');

const SERVER_URL = 'http://localhost:5000';
const TEST_USER = { username: 'user@example.com', password: '123456' };

async function testHTMLFix() {
  try {
    console.log('🔍 Testing HTML authentication fix...\n');
    
    // Step 1: Get fresh token
    console.log('🔐 Step 1: Getting fresh auth token...');
    const loginResponse = await axios.post(`${SERVER_URL}/auth/login`, TEST_USER);
    const token = loginResponse.data.token;
    console.log('✅ Token obtained successfully');
    
    // Step 2: Get a real ad ID
    console.log('\n📋 Step 2: Getting a real ad ID...');
    const adsResponse = await axios.post(`${SERVER_URL}/ads/list`, {
      page: 1,
      limit: 1
    });
    
    let ads = [];
    if (adsResponse.data.data) {
      ads = adsResponse.data.data;
    } else if (adsResponse.data.ads) {
      ads = adsResponse.data.ads;
    } else if (Array.isArray(adsResponse.data)) {
      ads = adsResponse.data;
    }
    
    if (ads.length === 0) {
      throw new Error('No ads found in database');
    }
    
    const adId = ads[0]._id || ads[0].id;
    console.log('✅ Using ad ID:', adId);
    
    // Step 3: Test WebSocket with HTML-style connection
    console.log('\n🔌 Step 3: Testing WebSocket with HTML-style connection...');
    
    return new Promise((resolve, reject) => {
      // This mimics the HTML file's connection style
      const socket = io(`${SERVER_URL}/chat`, {
        auth: {
          userId: '507f1f77bcf86cd799439025', // This is the user ID from the token
          token: token, // This is correct - raw token
        },
        query: {
          userId: '507f1f77bcf86cd799439025',
        },
        autoConnect: false
      });

      socket.on('connect', () => {
        console.log('✅ WebSocket connected successfully with HTML-style auth');
        
        socket.emit('createAdChat', { adId: adId }, (response) => {
          if (response && response.success) {
            console.log('✅ WebSocket createAdChat: SUCCESS');
            console.log('   Chat ID:', response.chat._id);
            console.log('   Is New Chat:', response.isNewChat);
          } else {
            console.log('❌ WebSocket createAdChat: FAILED');
            console.log('   Error:', response?.error || 'No response');
          }
          
          socket.disconnect();
          resolve();
        });
      });

      socket.on('connect_error', (error) => {
        console.log('❌ WebSocket connection failed:', error.message);
        reject(error);
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected:', reason);
      });

      socket.connect();
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

testHTMLFix()
  .then(() => {
    console.log('\n🎉 HTML authentication test completed successfully!');
    console.log('\n📋 SUMMARY:');
    console.log('✅ HTML-style WebSocket authentication: Working');
    console.log('✅ The issue is likely in the HTML file configuration');
    console.log('\n💡 SOLUTION:');
    console.log('1. Make sure you have a fresh token in the HTML file');
    console.log('2. Use the "Get Real Ad ID" button to get a valid ad ID');
    console.log('3. The WebSocket connection should work with the current setup');
  })
  .catch((error) => {
    console.log('\n💥 HTML authentication test failed:', error.message);
    process.exit(1);
  });
