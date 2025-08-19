const axios = require('axios');

async function testMultipleFilters() {
  try {
    console.log('🧪 Testing multiple fuel types and transmission types...');
    
    // Test 1: Multiple fuel types
    console.log('\n📋 Test 1: Multiple fuel types');
    const response1 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'trailer',
      bodyType: 'passenger',
      fuelTypeIds: ['507f1f77bcf86cd799439071', '507f1f77bcf86cd799439072']
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Multiple fuel types: ${response1.data.data.length} ads found`);

    // Test 2: Multiple transmission types
    console.log('\n📋 Test 2: Multiple transmission types');
    const response2 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'trailer',
      bodyType: 'passenger',
      transmissionTypeIds: ['507f1f77bcf86cd799439062', '507f1f77bcf86cd799439063']
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Multiple transmission types: ${response2.data.data.length} ads found`);

    // Test 3: Multiple manufacturers + fuel types + transmission types
    console.log('\n📋 Test 3: Multiple manufacturers + fuel types + transmission types');
    const response3 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'trailer',
      bodyType: 'passenger',
      manufacturerIds: ['507f1f77bcf86cd799439037', '507f1f77bcf86cd799439038'],
      fuelTypeIds: ['507f1f77bcf86cd799439071', '507f1f77bcf86cd799439072'],
      transmissionTypeIds: ['507f1f77bcf86cd799439062', '507f1f77bcf86cd799439063']
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Multiple manufacturers + fuel + transmission: ${response3.data.data.length} ads found`);

    // Test 4: Single fuel type (existing functionality)
    console.log('\n📋 Test 4: Single fuel type (existing functionality)');
    const response4 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'trailer',
      bodyType: 'passenger',
      fuelTypeId: '507f1f77bcf86cd799439071'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Single fuel type: ${response4.data.data.length} ads found`);

    // Test 5: Single transmission type (existing functionality)
    console.log('\n📋 Test 5: Single transmission type (existing functionality)');
    const response5 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'trailer',
      bodyType: 'passenger',
      transmissionTypeId: '507f1f77bcf86cd799439062'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Single transmission type: ${response5.data.data.length} ads found`);

    // Test 6: Mixed single and multiple filters
    console.log('\n📋 Test 6: Mixed single and multiple filters');
    const response6 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'trailer',
      bodyType: 'passenger',
      manufacturerId: '507f1f77bcf86cd799439037',
      fuelTypeIds: ['507f1f77bcf86cd799439071', '507f1f77bcf86cd799439072'],
      transmissionTypeId: '507f1f77bcf86cd799439062'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Mixed single and multiple filters: ${response6.data.data.length} ads found`);

  } catch (error) {
    console.error('❌ Error testing multiple filters:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testMultipleFilters();


