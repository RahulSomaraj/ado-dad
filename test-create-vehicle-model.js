const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testCreateVehicleModel() {
  console.log('🚗 Testing Vehicle Model Creation...\n');

  try {
    // Step 1: Login to get auth token
    console.log('1️⃣ Logging in to get auth token...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: '1212121212',
      password: '123456',
    });

    console.log('📄 Login response:', loginResponse.data);
    const authToken =
      loginResponse.data.access_token || loginResponse.data.token;
    console.log(
      '✅ Login successful, got auth token:',
      authToken ? 'Yes' : 'No',
    );
    console.log('');

    // Step 2: Get manufacturers to use for the new model
    console.log('2️⃣ Getting manufacturers...');
    const manufacturersResponse = await axios.get(
      `${BASE_URL}/vehicle-inventory/manufacturers`,
    );
    const manufacturers = manufacturersResponse.data.data;

    if (manufacturers.length === 0) {
      console.log('❌ No manufacturers found. Cannot create vehicle model.');
      return;
    }

    const firstManufacturer = manufacturers[0];
    console.log(
      `✅ Using manufacturer: ${firstManufacturer.displayName} (${firstManufacturer._id})`,
    );
    console.log('');

    // Step 3: Create a new vehicle model
    console.log('3️⃣ Creating new vehicle model...');
    const newModelData = {
      name: 'test-model-' + Date.now(),
      displayName: 'Test Model ' + new Date().toISOString().slice(0, 19),
      manufacturer: firstManufacturer._id,
      vehicleType: 'Hatchback',
      description: 'Test vehicle model for debugging',
      launchYear: 2024,
      segment: 'B',
      bodyType: 'Hatchback',
      images: ['https://example.com/test-model.jpg'],
      brochureUrl: 'https://example.com/test-model-brochure.pdf',
      isActive: true,
      fuelTypes: ['Petrol', 'Diesel'],
      transmissionTypes: ['Manual', 'Automatic'],
    };

    const createResponse = await axios.post(
      `${BASE_URL}/vehicle-inventory/models`,
      newModelData,
      {
        headers: {
          Authorization: authToken,
          'Content-Type': 'application/json',
        },
      },
    );

    const createdModel = createResponse.data;
    console.log('✅ Vehicle model created successfully!');
    console.log('📋 Created model:', {
      id: createdModel._id,
      name: createdModel.name,
      displayName: createdModel.displayName,
      manufacturer: createdModel.manufacturer,
      isActive: createdModel.isActive,
    });
    console.log('');

    // Step 4: Check if the new model appears in the list
    console.log('4️⃣ Checking if new model appears in the list...');
    const listResponse = await axios.get(
      `${BASE_URL}/vehicle-inventory/models`,
    );
    const allModels = listResponse.data.data;

    const foundModel = allModels.find((m) => m._id === createdModel._id);

    if (foundModel) {
      console.log('✅ New model found in the list!');
      console.log('📋 Found model:', {
        id: foundModel._id,
        name: foundModel.name,
        displayName: foundModel.displayName,
        manufacturer: foundModel.manufacturer?.displayName || 'No manufacturer',
        isActive: foundModel.isActive,
      });
    } else {
      console.log('❌ New model NOT found in the list!');
      console.log('🔍 Looking for model with ID:', createdModel._id);
      console.log('📊 Total models in list:', allModels.length);
      console.log(
        '📋 First few models:',
        allModels.slice(0, 3).map((m) => ({
          id: m._id,
          name: m.name,
          displayName: m.displayName,
        })),
      );
    }
    console.log('');

    // Step 5: Test debug endpoint
    console.log('5️⃣ Testing debug endpoint...');
    try {
      const debugResponse = await axios.get(
        `${BASE_URL}/vehicle-inventory/models/debug`,
      );
      console.log('✅ Debug endpoint working!');
      console.log('🔍 Debug info:', {
        simpleQueryCount: debugResponse.data.debug.simpleQuery.count,
        aggregatedQueryCount: debugResponse.data.debug.aggregatedQuery.count,
        aggregatedTotal: debugResponse.data.debug.aggregatedQuery.total,
      });

      // Check if our new model is in the debug results
      const simpleModels = debugResponse.data.debug.simpleQuery.models;
      const aggregatedModels = debugResponse.data.debug.aggregatedQuery.models;

      const inSimple = simpleModels.find((m) => m.id === createdModel._id);
      const inAggregated = aggregatedModels.find(
        (m) => m.id === createdModel._id,
      );

      console.log('🔍 Model in simple query:', !!inSimple);
      console.log('🔍 Model in aggregated query:', !!inAggregated);
    } catch (debugError) {
      console.log(
        '❌ Debug endpoint failed:',
        debugError.response?.data?.message || debugError.message,
      );
    }
    console.log('');

    // Step 6: Test with manufacturer filter
    console.log('6️⃣ Testing with manufacturer filter...');
    const filteredResponse = await axios.get(
      `${BASE_URL}/vehicle-inventory/models?manufacturerId=${firstManufacturer._id}`,
    );

    const filteredModels = filteredResponse.data.data;
    const foundInFiltered = filteredModels.find(
      (m) => m._id === createdModel._id,
    );

    if (foundInFiltered) {
      console.log('✅ New model found in filtered results!');
    } else {
      console.log('❌ New model NOT found in filtered results!');
      console.log('📊 Filtered models count:', filteredModels.length);
    }
    console.log('');

    console.log('✅ Test completed!');
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    if (error.response) {
      console.error('📄 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    }
  }
}

// Run the test
testCreateVehicleModel();
