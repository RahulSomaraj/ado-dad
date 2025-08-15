const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function debugEmptyResponse() {
  console.log('🔍 DEBUGGING EMPTY RESPONSE...\n');
  
  try {
    // Test 1: Get all ads without any filters
    console.log('1️⃣ Testing: GET /ads (no filters)');
    const response1 = await axios.get(`${BASE_URL}/ads`, {
      timeout: 10000
    });
    
    console.log(`   Status: ${response1.status}`);
    console.log(`   Response:`, JSON.stringify(response1.data, null, 2));
    
    // Test 2: Check if server is running
    console.log('\n2️⃣ Testing: Server health');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`, {
        timeout: 5000
      });
      console.log(`   Health Status: ${healthResponse.status}`);
    } catch (error) {
      console.log(`   Health Check Failed: ${error.message}`);
    }
    
    // Test 3: Check database directly
    console.log('\n3️⃣ Testing: Direct database check');
    try {
      const dbResponse = await axios.get(`${BASE_URL}/ads/count`, {
        timeout: 5000
      });
      console.log(`   Database Count:`, JSON.stringify(dbResponse.data, null, 2));
    } catch (error) {
      console.log(`   Database Check Failed: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugEmptyResponse();

