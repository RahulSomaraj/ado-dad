const axios = require('axios');

async function testSwaggerManufacturer() {
  try {
    console.log('🧪 Testing Swagger-like Request...\n');
    
    const baseURL = 'http://localhost:5001';
    const manufacturerId = '686fb37cab966c7e18f263f8';

    // Test 1: Simulate Swagger request with proper headers
    console.log('1. Testing with Swagger-like headers...');
    try {
      const swaggerResponse = await axios.get(`${baseURL}/ads?manufacturerId=${manufacturerId}&limit=5`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Swagger-UI/1.0'
        }
      });
      
      console.log('✅ Swagger-like request successful:');
      console.log(`   Status: ${swaggerResponse.status}`);
      console.log(`   Data length: ${swaggerResponse.data.data.length}`);
      console.log(`   Total: ${swaggerResponse.data.total}`);
      
      if (swaggerResponse.data.data.length > 0) {
        console.log('📋 First ad:');
        const ad = swaggerResponse.data.data[0];
        console.log(`   ID: ${ad.id}`);
        console.log(`   Category: ${ad.category}`);
        console.log(`   Price: ${ad.price}`);
        if (ad.vehicleDetails && ad.vehicleDetails.length > 0) {
          console.log(`   Manufacturer ID: ${ad.vehicleDetails[0].manufacturerId}`);
        }
      }
    } catch (error) {
      console.log('❌ Swagger-like request failed:', error.response?.data || error.message);
    }

    // Test 2: Test with different parameter formats
    console.log('\n2. Testing different parameter formats...');
    
    const testCases = [
      { name: 'String format', value: manufacturerId },
      { name: 'ObjectId format', value: manufacturerId },
      { name: 'With quotes', value: `"${manufacturerId}"` },
      { name: 'URL encoded', value: encodeURIComponent(manufacturerId) }
    ];

    for (const testCase of testCases) {
      try {
        const response = await axios.get(`${baseURL}/ads?manufacturerId=${testCase.value}&limit=1`);
        console.log(`✅ ${testCase.name}: ${response.data.data.length} ads found`);
      } catch (error) {
        console.log(`❌ ${testCase.name}: ${error.response?.status || error.message}`);
      }
    }

    // Test 3: Check if there are any CORS or other issues
    console.log('\n3. Testing CORS and headers...');
    try {
      const corsResponse = await axios.get(`${baseURL}/ads?manufacturerId=${manufacturerId}&limit=1`, {
        headers: {
          'Accept': '*/*',
          'Origin': 'http://localhost:3000',
          'Referer': 'http://localhost:3000/'
        }
      });
      console.log('✅ CORS test successful');
      console.log(`   Status: ${corsResponse.status}`);
      console.log(`   Data: ${corsResponse.data.data.length} ads`);
    } catch (error) {
      console.log('❌ CORS test failed:', error.response?.data || error.message);
    }

    // Test 4: Test the exact URL that Swagger might be generating
    console.log('\n4. Testing exact Swagger URL format...');
    try {
      const swaggerUrl = `${baseURL}/ads?manufacturerId=${manufacturerId}&limit=5&page=1&sortBy=postedAt&sortOrder=DESC`;
      const response = await axios.get(swaggerUrl);
      console.log('✅ Swagger URL format works:');
      console.log(`   URL: ${swaggerUrl}`);
      console.log(`   Results: ${response.data.data.length} ads`);
    } catch (error) {
      console.log('❌ Swagger URL format failed:', error.response?.data || error.message);
    }

    console.log('\n✅ Swagger testing completed!');
    console.log('\n💡 If Swagger is still not working, try:');
    console.log('   1. Clear browser cache');
    console.log('   2. Check browser console for errors');
    console.log('   3. Try different browser');
    console.log('   4. Check if Swagger UI is properly loading the API spec');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSwaggerManufacturer();
