const axios = require('axios');

async function debugManufacturerId() {
  try {
    console.log('🧪 Debugging manufacturer ID data type...');
    
    // Test 1: Get the actual data structure
    console.log('\n📋 Test 1: Getting actual data structure');
    const response1 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'trailer',
      bodyType: 'passenger'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response1.data.data.length > 0) {
      const ad = response1.data.data[0];
      const details = ad.commercialVehicleDetails[0];
      console.log('📋 Sample ad details:');
      console.log(`  Manufacturer ID: ${details.manufacturerId}`);
      console.log(`  Manufacturer ID type: ${typeof details.manufacturerId}`);
      console.log(`  Model ID: ${details.modelId}`);
      console.log(`  Model ID type: ${typeof details.modelId}`);
      console.log(`  Variant ID: ${details.variantId}`);
      console.log(`  Variant ID type: ${typeof details.variantId}`);
      console.log(`  Transmission Type ID: ${details.transmissionTypeId}`);
      console.log(`  Transmission Type ID type: ${typeof details.transmissionTypeId}`);
      console.log(`  Fuel Type ID: ${details.fuelTypeId}`);
      console.log(`  Fuel Type ID type: ${typeof details.fuelTypeId}`);
    }

    // Test 2: Try with string comparison (no ObjectId conversion)
    console.log('\n📋 Test 2: Testing with string manufacturer ID');
    const response2 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'trailer',
      bodyType: 'passenger',
      manufacturerId: '507f1f77bcf86cd799439037'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ String manufacturer ID: ${response2.data.data.length} ads found`);

    // Test 3: Try with model ID as string
    console.log('\n📋 Test 3: Testing with model ID as string');
    const response3 = await axios.post('http://localhost:5001/ads/filter', {
      category: 'commercial_vehicle',
      commercialVehicleType: 'trailer',
      bodyType: 'passenger',
      manufacturerId: '507f1f77bcf86cd799439037',
      modelId: '507f1f77bcf86cd799439042'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ String manufacturer + model ID: ${response3.data.data.length} ads found`);

  } catch (error) {
    console.error('❌ Error debugging manufacturer ID:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

debugManufacturerId();


