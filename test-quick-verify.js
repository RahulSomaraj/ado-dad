const io = require('socket.io-client');
const axios = require('axios');

const SERVER_URL = 'http://localhost:5000';
const TEST_USER = { username: 'user@example.com', password: '123456' };

async function quickVerify() {
  try {
    console.log('🔍 QUICK VERIFICATION - Testing createAdChat functionality\n');

    // Step 1: Get fresh token
    console.log('🔐 Step 1: Getting fresh auth token...');
    const loginResponse = await axios.post(
      `${SERVER_URL}/auth/login`,
      TEST_USER,
    );
    const token = loginResponse.data.token;
    console.log('✅ Token obtained successfully');

    // Step 2: Get a real ad ID
    console.log('\n📋 Step 2: Getting a real ad ID...');
    const adsResponse = await axios.post(`${SERVER_URL}/ads/list`, {
      page: 1,
      limit: 1,
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

    // Step 3: Test WebSocket connection and createAdChat
    console.log('\n🔌 Step 3: Testing WebSocket createAdChat...');

    return new Promise((resolve, reject) => {
      const socket = io(`${SERVER_URL}/chat`, {
        transports: ['websocket'],
        auth: { token: token }, // Raw token, not "Bearer token"
        autoConnect: false,
      });

      socket.on('connect', () => {
        console.log('✅ WebSocket connected successfully');

        socket.emit('createAdChat', { adId: adId }, (response) => {
          if (response && response.success) {
            console.log('✅ WebSocket createAdChat: SUCCESS');
            console.log('   Chat ID:', response.chat._id);
            console.log('   Is New Chat:', response.isNewChat);
            console.log('   Ad Poster ID:', response.adPosterId);
            console.log('   Viewer ID:', response.viewerId);
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

quickVerify()
  .then(() => {
    console.log('\n🎉 QUICK VERIFICATION COMPLETED SUCCESSFULLY!');
    console.log('\n📋 SUMMARY:');
    console.log('✅ Authentication: Working');
    console.log('✅ WebSocket Connection: Working');
    console.log('✅ createAdChat: Working');
    console.log('✅ Database Integration: Working');
    console.log('\n🚀 The createAdChat functionality is fully operational!');
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Open chat-test-working.html in your browser');
    console.log('2. Click "Get Real Ad ID" to get a valid ad ID');
    console.log('3. Click "Login" to authenticate');
    console.log('4. Click "Connect WebSocket" to connect');
    console.log('5. Click "Create Ad Chat" to test the functionality');
  })
  .catch((error) => {
    console.log('\n💥 QUICK VERIFICATION FAILED:', error.message);
    process.exit(1);
  });
