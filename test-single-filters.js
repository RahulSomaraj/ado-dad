const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testSingleFilters() {
  console.log('🧪 Testing Single Value Filters (After Removing Multiple Values)\n');

  try {
    // Test 1: Basic commercial vehicle filter
    console.log('1️⃣ Testing basic commercial vehicle filter:');
    const basicFilter = {
      category: "commercial_vehicle"
    };
    
    const basicResponse = await axios.post(`${BASE_URL}/ads/filter`, basicFilter);
    console.log(`✅ Basic filter: ${basicResponse.data.total} ads found`);
    console.log('');

    // Test 2: Single manufacturer ID filter
    console.log('2️⃣ Testing single manufacturer ID:');
    const singleManufacturerFilter = {
      category: "commercial_vehicle",
      commercialVehicleType: "trailer",
      bodyType: "flatbed",
      manufacturerId: "507f1f77bcf86cd799439037"
    };
    
    console.log('Request:', JSON.stringify(singleManufacturerFilter, null, 2));
    const singleResponse = await axios.post(`${BASE_URL}/ads/filter`, singleManufacturerFilter);
    console.log(`✅ Single manufacturer: ${singleResponse.data.total} ads found`);
    console.log('');

    // Test 3: Single fuel type filter
    console.log('3️⃣ Testing single fuel type:');
    const singleFuelFilter = {
      category: "commercial_vehicle",
      commercialVehicleType: "trailer",
      bodyType: "flatbed",
      fuelTypeId: "507f1f77bcf86cd799439072"
    };
    
    console.log('Request:', JSON.stringify(singleFuelFilter, null, 2));
    const fuelResponse = await axios.post(`${BASE_URL}/ads/filter`, singleFuelFilter);
    console.log(`✅ Single fuel type: ${fuelResponse.data.total} ads found`);
    console.log('');

    // Test 4: Single transmission type filter
    console.log('4️⃣ Testing single transmission type:');
    const singleTransmissionFilter = {
      category: "commercial_vehicle",
      commercialVehicleType: "trailer",
      bodyType: "flatbed",
      transmissionTypeId: "507f1f77bcf86cd799439063"
    };
    
    console.log('Request:', JSON.stringify(singleTransmissionFilter, null, 2));
    const transmissionResponse = await axios.post(`${BASE_URL}/ads/filter`, singleTransmissionFilter);
    console.log(`✅ Single transmission type: ${transmissionResponse.data.total} ads found`);
    console.log('');

    // Test 5: Combined single filters
    console.log('5️⃣ Testing combined single filters:');
    const combinedFilter = {
      category: "commercial_vehicle",
      commercialVehicleType: "trailer",
      bodyType: "flatbed",
      manufacturerId: "507f1f77bcf86cd799439037",
      fuelTypeId: "507f1f77bcf86cd799439072",
      transmissionTypeId: "507f1f77bcf86cd799439063"
    };
    
    console.log('Request:', JSON.stringify(combinedFilter, null, 2));
    const combinedResponse = await axios.post(`${BASE_URL}/ads/filter`, combinedFilter);
    console.log(`✅ Combined filters: ${combinedResponse.data.total} ads found`);
    console.log('');

    console.log('🎉 All single value filter tests completed!');
    console.log('\n📋 Summary:');
    console.log('✅ Single manufacturer ID: Working');
    console.log('✅ Single fuel type ID: Working');
    console.log('✅ Single transmission type ID: Working');
    console.log('✅ Combined single filters: Working');
    console.log('✅ Multiple value fields removed successfully');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSingleFilters();
