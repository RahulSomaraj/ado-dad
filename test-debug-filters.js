const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function debugFilters() {
  console.log('🔍 Debugging Filter Logic...\n');

  try {
    // Test 1: Get models with no filters
    console.log('1️⃣ Testing with no filters...');
    const response1 = await axios.get(`${BASE_URL}/vehicle-inventory/models`);
    console.log('📊 Total models (no filters):', response1.data.total);
    console.log('📄 Models returned:', response1.data.data.length);
    console.log('');

    // Test 2: Get models with explicit empty filters
    console.log('2️⃣ Testing with explicit empty filters...');
    const response2 = await axios.get(
      `${BASE_URL}/vehicle-inventory/models?fuelType=&transmissionType=&minPrice=&maxPrice=`,
    );
    console.log('📊 Total models (empty filters):', response2.data.total);
    console.log('📄 Models returned:', response2.data.data.length);
    console.log('');

    // Test 3: Get models with a specific filter
    console.log('3️⃣ Testing with fuelType filter...');
    const response3 = await axios.get(
      `${BASE_URL}/vehicle-inventory/models?fuelType=Petrol`,
    );
    console.log('📊 Total models (fuelType=Petrol):', response3.data.total);
    console.log('📄 Models returned:', response3.data.data.length);
    console.log('');

    // Test 4: Check debug endpoint
    console.log('4️⃣ Checking debug endpoint...');
    const debugResponse = await axios.get(
      `${BASE_URL}/vehicle-inventory/models/debug`,
    );
    console.log('🔍 Debug info:', {
      simpleQueryCount: debugResponse.data.debug.simpleQuery.count,
      aggregatedQueryCount: debugResponse.data.debug.aggregatedQuery.count,
      aggregatedTotal: debugResponse.data.debug.aggregatedQuery.total,
    });

    // Check if any models have variants
    const modelsWithVariants =
      debugResponse.data.debug.simpleQuery.models.filter(
        (m) => m.variantCount > 0,
      );
    const modelsWithoutVariants =
      debugResponse.data.debug.simpleQuery.models.filter(
        (m) => m.variantCount === 0,
      );

    console.log('📊 Models with variants:', modelsWithVariants.length);
    console.log('📊 Models without variants:', modelsWithoutVariants.length);

    if (modelsWithoutVariants.length > 0) {
      console.log(
        '📋 Models without variants:',
        modelsWithoutVariants.slice(0, 3).map((m) => ({
          id: m.id,
          name: m.name,
          displayName: m.displayName,
          variantCount: m.variantCount,
        })),
      );
    }
  } catch (error) {
    console.error('❌ Error during debugging:', error.message);
    if (error.response) {
      console.error('📄 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    }
  }
}

// Run the test
debugFilters();
