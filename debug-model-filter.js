const axios = require('axios');

async function debugModelFilter() {
  try {
    console.log('🔍 Debugging Model ID Filter Issue...\n');
    
    const baseURL = 'http://localhost:5000';

    // Test 1: Get all vehicle ads to see what modelIds exist
    console.log('1. Checking all vehicle ads...');
    try {
      const allVehiclesResponse = await axios.get(`${baseURL}/ads?category=private_vehicle&limit=5`);
      console.log('✅ Found vehicle ads:', allVehiclesResponse.data.data.length);
      
      if (allVehiclesResponse.data.data.length > 0) {
        console.log('📋 Sample vehicle ads:');
        allVehiclesResponse.data.data.forEach((ad, index) => {
          console.log(`   ${index + 1}. Ad ID: ${ad.id}`);
          console.log(`      Title: ${ad.title}`);
          console.log(`      Category: ${ad.category}`);
          if (ad.vehicleDetails) {
            console.log(`      Model ID: ${ad.vehicleDetails.modelId}`);
            console.log(`      Manufacturer ID: ${ad.vehicleDetails.manufacturerId}`);
          }
          console.log('');
        });
      }
    } catch (error) {
      console.log('❌ Error getting vehicle ads:', error.response?.data || error.message);
    }

    // Test 2: Get all commercial vehicle ads
    console.log('2. Checking all commercial vehicle ads...');
    try {
      const allCommercialResponse = await axios.get(`${baseURL}/ads?category=commercial_vehicle&limit=5`);
      console.log('✅ Found commercial vehicle ads:', allCommercialResponse.data.data.length);
      
      if (allCommercialResponse.data.data.length > 0) {
        console.log('📋 Sample commercial vehicle ads:');
        allCommercialResponse.data.data.forEach((ad, index) => {
          console.log(`   ${index + 1}. Ad ID: ${ad.id}`);
          console.log(`      Title: ${ad.title}`);
          console.log(`      Category: ${ad.category}`);
          if (ad.commercialVehicleDetails) {
            console.log(`      Model ID: ${ad.commercialVehicleDetails.modelId}`);
            console.log(`      Manufacturer ID: ${ad.commercialVehicleDetails.manufacturerId}`);
          }
          console.log('');
        });
      }
    } catch (error) {
      console.log('❌ Error getting commercial vehicle ads:', error.response?.data || error.message);
    }

    // Test 3: Try filtering with a specific modelId (if we found one)
    console.log('3. Testing modelId filter...');
    try {
      // First get a sample to extract modelId
      const sampleResponse = await axios.get(`${baseURL}/ads?category=private_vehicle&limit=1`);
      
      if (sampleResponse.data.data.length > 0) {
        const sampleAd = sampleResponse.data.data[0];
        if (sampleAd.vehicleDetails && sampleAd.vehicleDetails.modelId) {
          const modelId = sampleAd.vehicleDetails.modelId;
          console.log(`   Testing with modelId: ${modelId}`);
          
          const filterResponse = await axios.get(`${baseURL}/ads?modelId=${modelId}`);
          console.log(`   ✅ Filtered results: ${filterResponse.data.data.length} ads found`);
          
          if (filterResponse.data.data.length > 0) {
            console.log('   📋 Filtered ads:');
            filterResponse.data.data.forEach((ad, index) => {
              console.log(`      ${index + 1}. ${ad.title} (ID: ${ad.id})`);
            });
          } else {
            console.log('   ❌ No results found with modelId filter');
          }
        } else {
          console.log('   ⚠️ No modelId found in sample ad');
        }
      } else {
        console.log('   ⚠️ No vehicle ads found to test with');
      }
    } catch (error) {
      console.log('❌ Error testing modelId filter:', error.response?.data || error.message);
    }

    // Test 4: Check if the issue is with ObjectId conversion
    console.log('\n4. Testing with different modelId formats...');
    try {
      // Test with a dummy modelId to see the error
      const dummyModelId = '507f1f77bcf86cd799439011';
      console.log(`   Testing with dummy modelId: ${dummyModelId}`);
      
      const dummyResponse = await axios.get(`${baseURL}/ads?modelId=${dummyModelId}`);
      console.log(`   ✅ Dummy filter results: ${dummyResponse.data.data.length} ads found`);
      
    } catch (error) {
      console.log('❌ Error with dummy modelId:', error.response?.data || error.message);
    }

    console.log('\n✅ Debug completed!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugModelFilter();
