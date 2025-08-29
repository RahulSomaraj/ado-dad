const axios = require('axios');

const BASE_URL = 'https://uat.ado-dad.com';

async function testVehicleInventory() {
  console.log('🚗 Testing Vehicle Inventory API...\n');

  try {
    // Test 1: Get all models without filters
    console.log('1️⃣ Testing GET /vehicle-inventory/models (no filters)...');
    const response1 = await axios.get(`${BASE_URL}/vehicle-inventory/models`);
    console.log('✅ Response status:', response1.status);
    console.log('📊 Total models:', response1.data.total);
    console.log('📄 Models returned:', response1.data.data.length);
    console.log(
      '📋 First few models:',
      response1.data.data.slice(0, 3).map((m) => ({
        id: m._id,
        name: m.name,
        displayName: m.displayName,
        manufacturer: m.manufacturer?.displayName || 'No manufacturer',
      })),
    );
    console.log('');

    // Test 2: Debug endpoint
    console.log('2️⃣ Testing GET /vehicle-inventory/models/debug...');
    const response2 = await axios.get(
      `${BASE_URL}/vehicle-inventory/models/debug`,
    );
    console.log('✅ Response status:', response2.status);
    console.log('🔍 Debug info:', {
      simpleQueryCount: response2.data.debug.simpleQuery.count,
      aggregatedQueryCount: response2.data.debug.aggregatedQuery.count,
      aggregatedTotal: response2.data.debug.aggregatedQuery.total,
    });
    console.log('');

    // Test 3: Get manufacturers
    console.log('3️⃣ Testing GET /vehicle-inventory/manufacturers...');
    const response3 = await axios.get(
      `${BASE_URL}/vehicle-inventory/manufacturers`,
    );
    console.log('✅ Response status:', response3.status);
    console.log('📊 Total manufacturers:', response3.data.total);
    console.log('📄 Manufacturers returned:', response3.data.data.length);
    console.log(
      '📋 First few manufacturers:',
      response3.data.data.slice(0, 3).map((m) => ({
        id: m._id,
        name: m.name,
        displayName: m.displayName,
        isActive: m.isActive,
      })),
    );
    console.log('');

    // Test 4: Test with specific filters
    console.log(
      '4️⃣ Testing GET /vehicle-inventory/models with manufacturer filter...',
    );
    if (response3.data.data.length > 0) {
      const firstManufacturer = response3.data.data[0];
      const response4 = await axios.get(
        `${BASE_URL}/vehicle-inventory/models?manufacturerId=${firstManufacturer._id}`,
      );
      console.log('✅ Response status:', response4.status);
      console.log('📊 Models for manufacturer:', firstManufacturer.displayName);
      console.log('📄 Models returned:', response4.data.data.length);
      console.log(
        '📋 Models:',
        response4.data.data.map((m) => ({
          id: m._id,
          name: m.name,
          displayName: m.displayName,
        })),
      );
    }
    console.log('');

    // Test 5: Check if there are any models without manufacturers
    console.log('5️⃣ Checking for models without manufacturers...');
    const allModels = response1.data.data;
    const modelsWithoutManufacturer = allModels.filter((m) => !m.manufacturer);
    console.log(
      '📊 Models without manufacturer:',
      modelsWithoutManufacturer.length,
    );
    if (modelsWithoutManufacturer.length > 0) {
      console.log(
        '📋 Models without manufacturer:',
        modelsWithoutManufacturer.map((m) => ({
          id: m._id,
          name: m.name,
          displayName: m.displayName,
        })),
      );
    }
    console.log('');

    // Test 6: Check for inactive models
    console.log('6️⃣ Checking for inactive models...');
    const inactiveModels = allModels.filter((m) => !m.isActive);
    console.log('📊 Inactive models:', inactiveModels.length);
    if (inactiveModels.length > 0) {
      console.log(
        '📋 Inactive models:',
        inactiveModels.map((m) => ({
          id: m._id,
          name: m.name,
          displayName: m.displayName,
          isActive: m.isActive,
        })),
      );
    }
    console.log('');

    console.log('✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    if (error.response) {
      console.error('📄 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    }
  }
}

// Run the test
testVehicleInventory();
