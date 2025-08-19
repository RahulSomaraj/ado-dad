const axios = require('axios');

async function testManufacturerFilter() {
  try {
    console.log('🧪 Testing manufacturer filter with actual database values...');
    
    // Test 1: Basic trailer + passenger filter (working)
    console.log('\n📋 Test 1: Basic trailer + passenger filter');
    const response1 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'trailer',
      bodyType: 'passenger'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Basic filter: ${response1.data.data.length} ads found`);
    
    if (response1.data.data.length > 0) {
      const ad = response1.data.data[0];
      console.log('📋 Sample ad manufacturer ID:', ad.commercialVehicleDetails[0].manufacturerId);
    }

    // Test 2: With the actual manufacturer ID from the database
    console.log('\n📋 Test 2: With actual manufacturer ID from database');
    const response2 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'trailer',
      bodyType: 'passenger',
      manufacturerId: '507f1f77bcf86cd799439037'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ With manufacturer ID: ${response2.data.data.length} ads found`);

    // Test 3: Test different manufacturer IDs
    console.log('\n📋 Test 3: Testing different manufacturer IDs');
    const manufacturerIds = [
      '507f1f77bcf86cd799439031',
      '507f1f77bcf86cd799439032',
      '507f1f77bcf86cd799439033',
      '507f1f77bcf86cd799439034',
      '507f1f77bcf86cd799439035',
      '507f1f77bcf86cd799439036',
      '507f1f77bcf86cd799439037',
      '507f1f77bcf86cd799439038',
      '507f1f77bcf86cd799439039',
      '507f1f77bcf86cd799439040'
    ];

    for (const manufacturerId of manufacturerIds) {
      const response = await axios.post('http://localhost:5001/ads/filter', {
        category: 'commercial_vehicle',
        commercialVehicleType: 'trailer',
        bodyType: 'passenger',
        manufacturerId: manufacturerId
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`  Manufacturer ${manufacturerId}: ${response.data.data.length} ads`);
    }

    // Test 4: Test with model ID
    console.log('\n📋 Test 4: Testing with model ID');
    const response4 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'trailer',
      bodyType: 'passenger',
      manufacturerId: '507f1f77bcf86cd799439037',
      modelId: '507f1f77bcf86cd799439042'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ With manufacturer + model ID: ${response4.data.data.length} ads found`);

    // Test 5: Test with variant ID
    console.log('\n📋 Test 5: Testing with variant ID');
    const response5 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'trailer',
      bodyType: 'passenger',
      manufacturerId: '507f1f77bcf86cd799439037',
      modelId: '507f1f77bcf86cd799439042',
      variantId: '507f1f77bcf86cd799439057'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ With manufacturer + model + variant ID: ${response5.data.data.length} ads found`);

  } catch (error) {
    console.error('❌ Error testing manufacturer filter:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testManufacturerFilter();

