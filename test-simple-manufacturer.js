const axios = require('axios');

async function testSimpleManufacturer() {
  try {
    console.log('🧪 Testing simple manufacturer filter...');
    
    // Test 1: Just manufacturer ID (should trigger the condition)
    console.log('\n📋 Test 1: Just manufacturer ID');
    const response1 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      manufacturerId: '507f1f77bcf86cd799439037'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Just manufacturer ID: ${response1.data.data.length} ads found`);

    // Test 2: Manufacturer ID + commercial vehicle type
    console.log('\n📋 Test 2: Manufacturer ID + commercial vehicle type');
    const response2 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'trailer',
      manufacturerId: '507f1f77bcf86cd799439037'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Manufacturer ID + type: ${response2.data.data.length} ads found`);

    // Test 3: Manufacturer ID + body type
    console.log('\n📋 Test 3: Manufacturer ID + body type');
    const response3 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      bodyType: 'passenger',
      manufacturerId: '507f1f77bcf86cd799439037'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Manufacturer ID + body type: ${response3.data.data.length} ads found`);

    // Test 4: All three together
    console.log('\n📋 Test 4: All three together');
    const response4 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'trailer',
      bodyType: 'passenger',
      manufacturerId: '507f1f77bcf86cd799439037'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ All three together: ${response4.data.data.length} ads found`);

  } catch (error) {
    console.error('❌ Error testing simple manufacturer filter:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testSimpleManufacturer();


