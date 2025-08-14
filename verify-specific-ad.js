const axios = require('axios');

async function verifySpecificAd() {
  try {
    console.log('🧪 Verifying Specific Ad...\n');
    
    const baseURL = 'http://localhost:5001';
    const manufacturerId = '686fb37cab966c7e18f263f8';
    const expectedAdId = '689db5ad4ac1b812b8257ea4';

    // Test 1: Get the specific ad by ID
    console.log('1. Getting specific ad by ID...');
    try {
      const specificAdResponse = await axios.get(`${baseURL}/ads/${expectedAdId}`);
      console.log('✅ Specific ad found:');
      console.log(`   ID: ${specificAdResponse.data.id}`);
      console.log(`   Title: ${specificAdResponse.data.title}`);
      console.log(`   Category: ${specificAdResponse.data.category}`);
      console.log(`   Price: ${specificAdResponse.data.price}`);
      
      if (specificAdResponse.data.vehicleDetails && specificAdResponse.data.vehicleDetails.length > 0) {
        console.log(`   Vehicle Manufacturer ID: ${specificAdResponse.data.vehicleDetails[0].manufacturerId}`);
        console.log(`   Vehicle Model ID: ${specificAdResponse.data.vehicleDetails[0].modelId}`);
        console.log(`   Vehicle Year: ${specificAdResponse.data.vehicleDetails[0].year}`);
      }
    } catch (error) {
      console.log('❌ Error getting specific ad:', error.response?.data || error.message);
    }

    // Test 2: Filter by manufacturerId and check if our ad is in results
    console.log('\n2. Filtering by manufacturerId...');
    try {
      const filterResponse = await axios.get(`${baseURL}/ads?manufacturerId=${manufacturerId}&limit=10`);
      console.log(`✅ Filter returned ${filterResponse.data.data.length} ads`);
      
      const ourAd = filterResponse.data.data.find(ad => ad.id === expectedAdId);
      if (ourAd) {
        console.log('✅ Our Honda City ad IS in the filtered results!');
        console.log(`   Ad ID: ${ourAd.id}`);
        console.log(`   Title: ${ourAd.title}`);
        console.log(`   Category: ${ourAd.category}`);
      } else {
        console.log('❌ Our Honda City ad is NOT in the filtered results');
        console.log('Available ad IDs:', filterResponse.data.data.map(ad => ad.id));
      }
    } catch (error) {
      console.log('❌ Error filtering by manufacturerId:', error.response?.data || error.message);
    }

    // Test 3: Check the raw response structure
    console.log('\n3. Checking response structure...');
    try {
      const filterResponse = await axios.get(`${baseURL}/ads?manufacturerId=${manufacturerId}&limit=1`);
      console.log('✅ Response structure:');
      console.log(`   Status: ${filterResponse.status}`);
      console.log(`   Data length: ${filterResponse.data.data.length}`);
      console.log(`   Total: ${filterResponse.data.total}`);
      console.log(`   Page: ${filterResponse.data.page}`);
      console.log(`   Limit: ${filterResponse.data.limit}`);
      console.log(`   Has next: ${filterResponse.data.hasNext}`);
      console.log(`   Has prev: ${filterResponse.data.hasPrev}`);
    } catch (error) {
      console.log('❌ Error checking response structure:', error.response?.data || error.message);
    }

    console.log('\n✅ Verification completed!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifySpecificAd();
