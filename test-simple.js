const axios = require('axios');

const SERVER_URL = 'http://localhost:5000';
const TEST_USER = { username: 'user@example.com', password: '123456' };
let TEST_AD_ID = '68b06750f485f7533c070b1c'; // Will be updated with real ad ID

async function test() {
  try {
    console.log('🔐 Step 1: Getting auth token...');
    const loginResponse = await axios.post(
      `${SERVER_URL}/auth/login`,
      TEST_USER,
    );
    const token = loginResponse.data.token;
    console.log('✅ Token obtained:', token.substring(0, 50) + '...');

    console.log('\n📋 Step 2: Checking if ad exists...');
    const adsResponse = await axios.post(`${SERVER_URL}/ads/list`, {
      page: 1,
      limit: 10,
    });
    console.log('✅ Response received');
    console.log('Response keys:', Object.keys(adsResponse.data));
    console.log('Full response:', JSON.stringify(adsResponse.data, null, 2));

    // Try different possible response structures
    let ads = [];
    if (adsResponse.data.data) {
      ads = adsResponse.data.data;
    } else if (adsResponse.data.ads) {
      ads = adsResponse.data.ads;
    } else if (Array.isArray(adsResponse.data)) {
      ads = adsResponse.data;
    }

    console.log('✅ Ads found:', ads.length);

    if (ads.length > 0) {
      TEST_AD_ID = ads[0]._id || ads[0].id;
      console.log('✅ Using real ad ID:', TEST_AD_ID);
    } else {
      console.log('❌ No ads found in response');
    }

    console.log('\n🌐 Step 3: Testing REST API createAdChat...');
    const chatResponse = await axios.post(
      `${SERVER_URL}/chat/ad/${TEST_AD_ID}`,
      {},
      {
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
      },
    );
    console.log('✅ REST API createAdChat successful:', chatResponse.data);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

test();
