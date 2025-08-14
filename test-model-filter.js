const axios = require('axios');

async function testModelFilter() {
  try {
    console.log('🧪 Testing Model ID Filter...\n');
    
    const baseURL = 'http://localhost:5000';

    // Test 1: Get all ads to see what's available
    console.log('1. Getting all ads...');
    try {
      const allAdsResponse = await axios.get(`${baseURL}/ads?limit=5`);
      console.log(`✅ Found ${allAdsResponse.data.data.length} ads total`);
      
      if (allAdsResponse.data.data.length > 0) {
        console.log('📋 Sample ads:');
        allAdsResponse.data.data.forEach((ad, index) => {
          console.log(`   ${index + 1}. ${ad.title} (${ad.category})`);
          if (ad.vehicleDetails) {
            console.log(`      Vehicle Model ID: ${ad.vehicleDetails.modelId}`);
          }
          if (ad.commercialVehicleDetails) {
            console.log(`      Commercial Model ID: ${ad.commercialVehicleDetails.modelId}`);
          }
        });
      }
    } catch (error) {
      console.log('❌ Error getting all ads:', error.response?.data || error.message);
      return;
    }

    // Test 2: Test modelId filter with a dummy ID
    console.log('\n2. Testing modelId filter with dummy ID...');
    try {
      const dummyModelId = '507f1f77bcf86cd799439011';
      const filterResponse = await axios.get(`${baseURL}/ads?modelId=${dummyModelId}`);
      console.log(`✅ Filtered results: ${filterResponse.data.data.length} ads found`);
      
      if (filterResponse.data.data.length > 0) {
        console.log('📋 Filtered ads:');
        filterResponse.data.data.forEach((ad, index) => {
          console.log(`   ${index + 1}. ${ad.title} (${ad.category})`);
        });
      }
    } catch (error) {
      console.log('❌ Error with modelId filter:', error.response?.data || error.message);
    }

    // Test 3: Test with category + modelId
    console.log('\n3. Testing category + modelId filter...');
    try {
      const dummyModelId = '507f1f77bcf86cd799439011';
      const filterResponse = await axios.get(`${baseURL}/ads?category=private_vehicle&modelId=${dummyModelId}`);
      console.log(`✅ Category + ModelId results: ${filterResponse.data.data.length} ads found`);
    } catch (error) {
      console.log('❌ Error with category + modelId filter:', error.response?.data || error.message);
    }

    // Test 4: Test with commercial vehicle + modelId
    console.log('\n4. Testing commercial vehicle + modelId filter...');
    try {
      const dummyModelId = '507f1f77bcf86cd799439011';
      const filterResponse = await axios.get(`${baseURL}/ads?category=commercial_vehicle&modelId=${dummyModelId}`);
      console.log(`✅ Commercial + ModelId results: ${filterResponse.data.data.length} ads found`);
    } catch (error) {
      console.log('❌ Error with commercial + modelId filter:', error.response?.data || error.message);
    }

    console.log('\n✅ Model ID filter testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testModelFilter();
