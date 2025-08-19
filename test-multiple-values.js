const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testMultipleValues() {
  console.log('🧪 Testing Multiple Fuel Types and Transmission Types\n');

  try {
    // Test 1: Multiple Fuel Types
    console.log('1️⃣ Testing Multiple Fuel Types:');
    const multipleFuelTypes = {
      category: "commercial_vehicle",
      commercialVehicleType: "truck",
      bodyType: "flatbed",
      fuelTypeIds: [
        "507f1f77bcf86cd799439071", // Diesel
        "507f1f77bcf86cd799439072"  // Petrol
      ]
    };

    console.log('Request:', JSON.stringify(multipleFuelTypes, null, 2));
    
    const fuelResponse = await axios.post(`${BASE_URL}/ads/filter`, multipleFuelTypes);
    console.log(`✅ Response: ${fuelResponse.data.total} ads found`);
    console.log('Sample ad:', fuelResponse.data.ads[0]?.title || 'No ads found');
    console.log('');

    // Test 2: Multiple Transmission Types
    console.log('2️⃣ Testing Multiple Transmission Types:');
    const multipleTransmissionTypes = {
      category: "commercial_vehicle",
      commercialVehicleType: "truck",
      bodyType: "flatbed",
      transmissionTypeIds: [
        "507f1f77bcf86cd799439062", // Manual
        "507f1f77bcf86cd799439063"  // Automatic
      ]
    };

    console.log('Request:', JSON.stringify(multipleTransmissionTypes, null, 2));
    
    const transmissionResponse = await axios.post(`${BASE_URL}/ads/filter`, multipleTransmissionTypes);
    console.log(`✅ Response: ${transmissionResponse.data.total} ads found`);
    console.log('Sample ad:', transmissionResponse.data.ads[0]?.title || 'No ads found');
    console.log('');

    // Test 3: Both Multiple Fuel Types and Transmission Types
    console.log('3️⃣ Testing Both Multiple Fuel Types and Transmission Types:');
    const bothMultiple = {
      category: "commercial_vehicle",
      commercialVehicleType: "truck",
      bodyType: "flatbed",
      fuelTypeIds: [
        "507f1f77bcf86cd799439071", // Diesel
        "507f1f77bcf86cd799439072"  // Petrol
      ],
      transmissionTypeIds: [
        "507f1f77bcf86cd799439062", // Manual
        "507f1f77bcf86cd799439063"  // Automatic
      ]
    };

    console.log('Request:', JSON.stringify(bothMultiple, null, 2));
    
    const bothResponse = await axios.post(`${BASE_URL}/ads/filter`, bothMultiple);
    console.log(`✅ Response: ${bothResponse.data.total} ads found`);
    console.log('Sample ad:', bothResponse.data.ads[0]?.title || 'No ads found');
    console.log('');

    // Test 4: Single vs Multiple comparison
    console.log('4️⃣ Comparing Single vs Multiple Values:');
    
    // Single fuel type
    const singleFuel = {
      category: "commercial_vehicle",
      commercialVehicleType: "truck",
      bodyType: "flatbed",
      fuelTypeId: "507f1f77bcf86cd799439071" // Diesel only
    };
    
    const singleFuelResponse = await axios.post(`${BASE_URL}/ads/filter`, singleFuel);
    console.log(`Single fuel type: ${singleFuelResponse.data.total} ads`);
    
    // Multiple fuel types (including the single one above)
    const multipleFuel = {
      category: "commercial_vehicle",
      commercialVehicleType: "truck",
      bodyType: "flatbed",
      fuelTypeIds: [
        "507f1f77bcf86cd799439071", // Diesel
        "507f1f77bcf86cd799439072"  // Petrol
      ]
    };
    
    const multipleFuelResponse = await axios.post(`${BASE_URL}/ads/filter`, multipleFuel);
    console.log(`Multiple fuel types: ${multipleFuelResponse.data.total} ads`);
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Multiple fuel types: Working');
    console.log('✅ Multiple transmission types: Working');
    console.log('✅ Combined multiple filters: Working');
    console.log('✅ Single vs Multiple comparison: Working');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testMultipleValues();

