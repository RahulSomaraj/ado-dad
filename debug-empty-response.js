const axios = require('axios');

async function debugEmptyResponse() {
  try {
    console.log('🔍 Debugging Empty Response...\n');
    
    const baseURL = 'http://localhost:5001';
    const manufacturerId = '686fb37cab966c7e18f263f8';

    // Test 1: Get all ads and check their manufacturerIds
    console.log('1. Checking all ads for manufacturerId...');
    try {
      const allAdsResponse = await axios.get(`${baseURL}/ads?limit=50`);
      console.log(`✅ Found ${allAdsResponse.data.total} ads total`);
      
      const vehicleAds = allAdsResponse.data.data.filter(ad => 
        ad.category === 'private_vehicle' || ad.category === 'commercial_vehicle'
      );
      
      console.log(`📊 Vehicle ads found: ${vehicleAds.length}`);
      
      // Check each vehicle ad for manufacturerId
      vehicleAds.forEach((ad, index) => {
        console.log(`\n   Ad ${index + 1}:`);
        console.log(`   ID: ${ad.id}`);
        console.log(`   Category: ${ad.category}`);
        
        if (ad.vehicleDetails && ad.vehicleDetails.length > 0) {
          const vehicleDetail = ad.vehicleDetails[0];
          console.log(`   Manufacturer ID: ${vehicleDetail.manufacturerId}`);
          console.log(`   Model ID: ${vehicleDetail.modelId}`);
          console.log(`   Year: ${vehicleDetail.year}`);
          
          // Check if this matches our target
          if (vehicleDetail.manufacturerId === manufacturerId) {
            console.log(`   ✅ MATCHES TARGET MANUFACTURER!`);
          }
        } else {
          console.log(`   ❌ No vehicleDetails found`);
        }
      });
    } catch (error) {
      console.log('❌ Error getting all ads:', error.response?.data || error.message);
    }

    // Test 2: Check the specific Honda City ad
    console.log('\n2. Checking specific Honda City ad...');
    try {
      const hondaAdId = '689db5ad4ac1b812b8257ea4';
      const hondaResponse = await axios.get(`${baseURL}/ads/${hondaAdId}`);
      
      console.log('✅ Honda City ad details:');
      console.log(`   ID: ${hondaResponse.data.id}`);
      console.log(`   Category: ${hondaResponse.data.category}`);
      
      if (hondaResponse.data.vehicleDetails && hondaResponse.data.vehicleDetails.length > 0) {
        const vehicleDetail = hondaResponse.data.vehicleDetails[0];
        console.log(`   Manufacturer ID: ${vehicleDetail.manufacturerId}`);
        console.log(`   Model ID: ${vehicleDetail.modelId}`);
        console.log(`   Year: ${vehicleDetail.year}`);
        
        // Check if manufacturerId matches
        if (vehicleDetail.manufacturerId === manufacturerId) {
          console.log(`   ✅ Manufacturer ID matches target`);
        } else {
          console.log(`   ❌ Manufacturer ID does NOT match target`);
          console.log(`   Expected: ${manufacturerId}`);
          console.log(`   Actual: ${vehicleDetail.manufacturerId}`);
        }
      }
    } catch (error) {
      console.log('❌ Error getting Honda City ad:', error.response?.data || error.message);
    }

    // Test 3: Test the filter with different approaches
    console.log('\n3. Testing filter with different approaches...');
    
    const filterTests = [
      { name: 'Basic manufacturerId filter', url: `${baseURL}/ads?manufacturerId=${manufacturerId}` },
      { name: 'With category filter', url: `${baseURL}/ads?category=private_vehicle&manufacturerId=${manufacturerId}` },
      { name: 'With limit', url: `${baseURL}/ads?manufacturerId=${manufacturerId}&limit=10` },
      { name: 'URL encoded', url: `${baseURL}/ads?manufacturerId=${encodeURIComponent(manufacturerId)}` }
    ];

    for (const test of filterTests) {
      try {
        const response = await axios.get(test.url);
        console.log(`✅ ${test.name}:`);
        console.log(`   URL: ${test.url}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Data length: ${response.data.data.length}`);
        console.log(`   Total: ${response.data.total}`);
        
        if (response.data.data.length > 0) {
          console.log(`   First ad ID: ${response.data.data[0].id}`);
        }
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.response?.status || error.message}`);
      }
    }

    // Test 4: Check if there's a data type issue
    console.log('\n4. Checking for data type issues...');
    try {
      const allAdsResponse = await axios.get(`${baseURL}/ads?limit=10`);
      const vehicleAds = allAdsResponse.data.data.filter(ad => 
        ad.vehicleDetails && ad.vehicleDetails.length > 0
      );
      
      if (vehicleAds.length > 0) {
        const sampleVehicle = vehicleAds[0];
        const manufacturerIdInDb = sampleVehicle.vehicleDetails[0].manufacturerId;
        
        console.log('📊 Data type analysis:');
        console.log(`   Target manufacturerId type: ${typeof manufacturerId}`);
        console.log(`   Target manufacturerId value: ${manufacturerId}`);
        console.log(`   DB manufacturerId type: ${typeof manufacturerIdInDb}`);
        console.log(`   DB manufacturerId value: ${manufacturerIdInDb}`);
        console.log(`   Strict equality: ${manufacturerId === manufacturerIdInDb}`);
        console.log(`   Loose equality: ${manufacturerId == manufacturerIdInDb}`);
      }
    } catch (error) {
      console.log('❌ Error checking data types:', error.response?.data || error.message);
    }

    console.log('\n✅ Debugging completed!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugEmptyResponse();
