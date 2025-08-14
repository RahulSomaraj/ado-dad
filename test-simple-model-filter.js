const axios = require('axios');

async function testSimpleModelFilter() {
  try {
    console.log('🧪 Testing Simplified Model ID Filter...\n');
    
    const baseURL = 'http://localhost:5000';

    // Test 1: Get all ads first
    console.log('1. Getting all ads...');
    try {
      const allAdsResponse = await axios.get(`${baseURL}/ads?limit=10`);
      console.log(`✅ Found ${allAdsResponse.data.data.length} ads total`);
      
      if (allAdsResponse.data.data.length > 0) {
        console.log('📋 Sample ads:');
        allAdsResponse.data.data.forEach((ad, index) => {
          console.log(`   ${index + 1}. ${ad.title || 'No title'} (${ad.category})`);
          if (ad.vehicleDetails && ad.vehicleDetails.length > 0) {
            console.log(`      Vehicle Model ID: ${ad.vehicleDetails[0].modelId}`);
          }
          if (ad.commercialVehicleDetails && ad.commercialVehicleDetails.length > 0) {
            console.log(`      Commercial Model ID: ${ad.commercialVehicleDetails[0].modelId}`);
          }
        });
      }
    } catch (error) {
      console.log('❌ Error getting all ads:', error.response?.data || error.message);
      return;
    }

    // Test 2: Test modelId filter with a real modelId from the data
    console.log('\n2. Testing modelId filter...');
    try {
      // Get a real modelId from the first vehicle ad
      const allAdsResponse = await axios.get(`${baseURL}/ads?limit=20`);
      let testModelId = null;
      
      for (const ad of allAdsResponse.data.data) {
        if (ad.vehicleDetails && ad.vehicleDetails.length > 0 && ad.vehicleDetails[0].modelId) {
          testModelId = ad.vehicleDetails[0].modelId;
          break;
        }
        if (ad.commercialVehicleDetails && ad.commercialVehicleDetails.length > 0 && ad.commercialVehicleDetails[0].modelId) {
          testModelId = ad.commercialVehicleDetails[0].modelId;
          break;
        }
      }
      
      if (testModelId) {
        console.log(`🔍 Testing with real modelId: ${testModelId}`);
        const filterResponse = await axios.get(`${baseURL}/ads?modelId=${testModelId}`);
        console.log(`✅ Filtered results: ${filterResponse.data.data.length} ads found`);
        
        if (filterResponse.data.data.length > 0) {
          console.log('📋 Filtered ads:');
          filterResponse.data.data.forEach((ad, index) => {
            console.log(`   ${index + 1}. ${ad.title || 'No title'} (${ad.category})`);
          });
        }
      } else {
        console.log('⚠️ No ads with modelId found to test with');
      }
    } catch (error) {
      console.log('❌ Error with modelId filter:', error.response?.data || error.message);
    }

    console.log('\n✅ Model ID filter testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSimpleModelFilter();
