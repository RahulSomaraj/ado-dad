const axios = require('axios');

async function testCommercialVehicleFilter() {
  try {
    console.log('🧪 Testing commercial vehicle filter...');
    
    // Test 1: Basic commercial vehicle filter with higher limit
    console.log('\n📋 Test 1: Basic commercial vehicle filter with limit 50');
    const response1 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      limit: 50
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Filter request successful!');
    console.log(`📊 Total ads found: ${response1.data.total}`);
    console.log(`📄 Page: ${response1.data.page}`);
    console.log(`📋 Limit: ${response1.data.limit}`);
    console.log(`📈 Total pages: ${response1.data.totalPages}`);
    
    if (response1.data.data && response1.data.data.length > 0) {
      console.log(`🚛 Commercial vehicle ads found: ${response1.data.data.length}`);
      console.log('📋 Sample ad details:');
      const sampleAd = response1.data.data[0];
      console.log(`   - ID: ${sampleAd.id}`);
      console.log(`   - Title: ${sampleAd.title}`);
      console.log(`   - Category: ${sampleAd.category}`);
      console.log(`   - Commercial Vehicle Type: ${sampleAd.commercialVehicleDetails?.commercialVehicleType}`);
      console.log(`   - Body Type: ${sampleAd.commercialVehicleDetails?.bodyType}`);
      
      // Show full sample ad structure
      console.log('\n🔍 Full sample ad structure:');
      console.log(JSON.stringify(sampleAd, null, 2));
    } else {
      console.log('❌ No commercial vehicle ads found');
    }

    // Test 2: Specific commercial vehicle type filter
    console.log('\n📋 Test 2: Specific commercial vehicle type filter');
    const response2 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'truck'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`🚛 Truck ads found: ${response2.data.data?.length || 0}`);

  } catch (error) {
    console.error('❌ Error testing commercial vehicle filter:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testCommercialVehicleFilter();
