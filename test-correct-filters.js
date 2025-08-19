const axios = require('axios');

async function testCorrectFilters() {
  try {
    console.log('🧪 Testing commercial vehicle filters with correct database values...');
    
    // Test 1: Basic commercial vehicle filter
    console.log('\n📋 Test 1: Basic commercial vehicle filter');
    const response1 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Basic filter: ${response1.data.data.length} ads found`);

    // Test 2: Trailer filter (from actual database data)
    console.log('\n📋 Test 2: Trailer filter');
    const response2 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'trailer'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Trailer filter: ${response2.data.data.length} ads found`);

    // Test 3: Passenger body type filter
    console.log('\n📋 Test 3: Passenger body type filter');
    const response3 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      bodyType: 'passenger'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Passenger body type filter: ${response3.data.data.length} ads found`);

    // Test 4: Trailer + Passenger combination
    console.log('\n📋 Test 4: Trailer + Passenger combination');
    const response4 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'trailer',
      bodyType: 'passenger'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Trailer + Passenger filter: ${response4.data.data.length} ads found`);

    // Test 5: Van filter
    console.log('\n📋 Test 5: Van filter');
    const response5 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'van'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Van filter: ${response5.data.data.length} ads found`);

    // Test 6: Tractor filter
    console.log('\n📋 Test 6: Tractor filter');
    const response6 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'tractor'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Tractor filter: ${response6.data.data.length} ads found`);

    // Test 7: Truck filter (should work now)
    console.log('\n📋 Test 7: Truck filter');
    const response7 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'truck'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Truck filter: ${response7.data.data.length} ads found`);

    // Test 8: Year filter
    console.log('\n📋 Test 8: Year filter (2022)');
    const response8 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      minYear: 2022,
      maxYear: 2022
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Year 2022 filter: ${response8.data.data.length} ads found`);

    // Test 9: Color filter
    console.log('\n📋 Test 9: Color filter (White)');
    const response9 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      color: 'White'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ White color filter: ${response9.data.data.length} ads found`);

  } catch (error) {
    console.error('❌ Error testing filters:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testCorrectFilters();


