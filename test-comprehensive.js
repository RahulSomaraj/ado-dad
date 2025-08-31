const io = require('socket.io-client');
const axios = require('axios');

const SERVER_URL = 'http://localhost:5000';
const TEST_USER = { username: 'user@example.com', password: '123456' };

async function testComprehensive() {
  try {
    console.log('🔐 Step 1: Getting fresh auth token...');
    const loginResponse = await axios.post(`${SERVER_URL}/auth/login`, TEST_USER);
    const token = loginResponse.data.token;
    console.log('✅ Fresh token obtained:', token.substring(0, 50) + '...');
    
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
    console.log('✅ Using real ad ID:', adId);
    
    console.log('\n🌐 Step 3: Testing REST API createAdChat...');
    try {
      const restResponse = await axios.post(
        `${SERVER_URL}/chat/ad/${adId}`,
        {},
        {
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ REST API createAdChat successful:', restResponse.data);
    } catch (restError) {
      console.log('❌ REST API failed:', restError.response?.data || restError.message);
    }
    
    console.log('\n🔌 Step 4: Testing WebSocket createAdChat...');
    
    return new Promise((resolve, reject) => {
      const socket = io(`${SERVER_URL}/chat`, {
        transports: ['websocket'],
        auth: {
          token: token  // Send token without 'Bearer ' prefix
        },
        autoConnect: false
      });

      socket.on('connect', () => {
        console.log('✅ WebSocket connected successfully');
        
        socket.emit('createAdChat', { adId: adId }, (response) => {
          if (response && response.success) {
            console.log('✅ WebSocket createAdChat successful:');
            console.log('   Chat ID:', response.chat._id);
            console.log('   Ad Poster ID:', response.adPosterId);
            console.log('   Viewer ID:', response.viewerId);
            console.log('   Is New Chat:', response.isNewChat);
            
            socket.disconnect();
            resolve(response);
          } else {
            console.log('❌ WebSocket createAdChat failed:', response?.error || 'No response');
            socket.disconnect();
            reject(new Error(response?.error || 'No response'));
          }
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
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    throw error;
  }
}

testComprehensive()
  .then(() => {
    console.log('\n🎉 Comprehensive test completed successfully!');
  })
  .catch((error) => {
    console.log('\n💥 Comprehensive test failed:', error.message);
    process.exit(1);
  });
