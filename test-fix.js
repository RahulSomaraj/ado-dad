const axios = require('axios');

async function testFix() {
  try {
    console.log('🧪 Testing the Fix...\n');
    
    const baseURL = 'http://localhost:5001';
    const manufacturerId = '686fb37cab966c7e18f263f8';

    // Test 1: Check if vehicleDetails are now populated
    console.log('1. Testing if vehicleDetails are populated...');
    try {
      const allAdsResponse = await axios.get(`${baseURL}/ads?limit=5`);
      console.log(`✅ Found ${allAdsResponse.data.total} ads total`);
      
      const vehicleAds = allAdsResponse.data.data.filter(ad => 
        ad.category === 'private_vehicle' || ad.category === 'commercial_vehicle'
      );
      
      console.log(`📊 Vehicle ads found: ${vehicleAds.length}`);
      
      vehicleAds.forEach((ad, index) => {
        console.log(`\n   Ad ${index + 1}:`);
        console.log(`   ID: ${ad.id}`);
        console.log(`   Category: ${ad.category}`);
        console.log(`   Has vehicleDetails: ${ad.vehicleDetails ? 'Yes' : 'No'}`);
        
        if (ad.vehicleDetails && ad.vehicleDetails.length > 0) {
          console.log(`   ✅ VehicleDetails found!`);
          console.log(`   VehicleDetails length: ${ad.vehicleDetails.length}`);
          console.log(`   Manufacturer ID: ${ad.vehicleDetails[0].manufacturerId}`);
          console.log(`   Model ID: ${ad.vehicleDetails[0].modelId}`);
          console.log(`   Year: ${ad.vehicleDetails[0].year}`);
        } else {
          console.log(`   ❌ No vehicleDetails found`);
        }
      });
    } catch (error) {
      console.log('❌ Error checking vehicleDetails:', error.response?.data || error.message);
    }

    // Test 2: Test the manufacturerId filter
    console.log('\n2. Testing manufacturerId filter...');
    try {
      const filterResponse = await axios.get(`${baseURL}/ads?manufacturerId=${manufacturerId}&limit=5`);
      console.log(`✅ Filter response: ${filterResponse.data.data.length} ads found`);
      console.log(`   Total: ${filterResponse.data.total}`);
      
      if (filterResponse.data.data.length > 0) {
        const ad = filterResponse.data.data[0];
        console.log('📋 First filtered ad:');
        console.log(`   ID: ${ad.id}`);
        console.log(`   Category: ${ad.category}`);
        console.log(`   Has vehicleDetails: ${ad.vehicleDetails ? 'Yes' : 'No'}`);
        
        if (ad.vehicleDetails && ad.vehicleDetails.length > 0) {
          console.log(`   ✅ VehicleDetails found!`);
          console.log(`   Manufacturer ID: ${ad.vehicleDetails[0].manufacturerId}`);
          console.log(`   Model ID: ${ad.vehicleDetails[0].modelId}`);
          console.log(`   Year: ${ad.vehicleDetails[0].year}`);
        }
      }
    } catch (error) {
      console.log('❌ Error with manufacturerId filter:', error.response?.data || error.message);
    }

    // Test 3: Test Swagger-like request
    console.log('\n3. Testing Swagger-like request...');
    try {
      const swaggerResponse = await axios.get(`${baseURL}/ads?manufacturerId=${manufacturerId}&limit=1`);
      console.log('✅ Swagger-like request successful:');
      console.log(`   Status: ${swaggerResponse.status}`);
      console.log(`   Data length: ${swaggerResponse.data.data.length}`);
      console.log(`   Total: ${swaggerResponse.data.total}`);
      
      if (swaggerResponse.data.data.length > 0) {
        console.log('📋 Response structure:');
        console.log(`   Has vehicleDetails: ${swaggerResponse.data.data[0].vehicleDetails ? 'Yes' : 'No'}`);
        if (swaggerResponse.data.data[0].vehicleDetails) {
          console.log(`   VehicleDetails length: ${swaggerResponse.data.data[0].vehicleDetails.length}`);
        }
      }
    } catch (error) {
      console.log('❌ Swagger-like request failed:', error.response?.data || error.message);
    }

    console.log('\n✅ Fix testing completed!');
    console.log('\n🎉 If you see "✅ VehicleDetails found!" above, the fix is working!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFix();

