const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testVehicleModelCRUD() {
  console.log('🚗 Testing Vehicle Model CRUD Operations Only...\n');

  let authToken = null;
  let modelId = null;

  try {
    // Step 1: Login
    console.log('🔐 Step 1: Login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: '1212121212',
      password: '123456',
    });

    authToken = loginResponse.data.token;
    console.log('✅ Login successful!');
    console.log('Token:', authToken.substring(0, 50) + '...');

    // Step 2: Get a manufacturer ID first (we need this to create a model)
    console.log('\n🏭 Step 2: Getting a manufacturer for model creation...');
    const manufacturersResponse = await axios.get(
      `${BASE_URL}/vehicle-inventory/manufacturers`,
      {
        headers: { Authorization: authToken },
      },
    );

    const manufacturerId = manufacturersResponse.data.data[0]._id;
    console.log('✅ Found manufacturer:', manufacturerId);

    // Step 3: Test Vehicle Model CRUD
    console.log('\n🚗 Step 3: Testing Vehicle Model CRUD...');

    // Create vehicle model
    console.log('📝 Creating vehicle model...');
    const uniqueId = Date.now();
    const modelData = {
      name: `test-model-${uniqueId}`,
      displayName: `Test Model ${uniqueId}`,
      manufacturer: manufacturerId,
      vehicleType: 'Hatchback',
      description: 'A test vehicle model',
      launchYear: 2020,
      segment: 'B',
      bodyType: 'Hatchback',
      images: ['https://example.com/model1.jpg'],
      brochureUrl: 'https://example.com/brochure.pdf',
      isActive: true,
    };

    const createModelResponse = await axios.post(
      `${BASE_URL}/vehicle-inventory/models`,
      modelData,
      {
        headers: { Authorization: authToken },
      },
    );

    modelId = createModelResponse.data._id;
    console.log('✅ Vehicle model created! ID:', modelId);

    // Get all models
    console.log('📋 Getting all vehicle models...');
    const getModelsResponse = await axios.get(
      `${BASE_URL}/vehicle-inventory/models`,
      {
        headers: { Authorization: authToken },
      },
    );
    console.log(
      '✅ Found',
      getModelsResponse.data.data.length,
      'vehicle models',
    );

    // Get model by ID
    console.log('🔍 Getting vehicle model by ID...');
    const getModelResponse = await axios.get(
      `${BASE_URL}/vehicle-inventory/models/${modelId}`,
      {
        headers: { Authorization: authToken },
      },
    );
    console.log(
      '✅ Vehicle model retrieved:',
      getModelResponse.data.displayName,
    );

    // Update model
    console.log('✏️ Updating vehicle model...');
    const updateModelData = {
      displayName: 'Updated Test Model',
      description: 'Updated model description',
    };

    const updateModelResponse = await axios.put(
      `${BASE_URL}/vehicle-inventory/models/${modelId}`,
      updateModelData,
      {
        headers: { Authorization: authToken },
      },
    );
    console.log('✅ Vehicle model updated!');

    console.log(
      '\n🎉 All Vehicle Model CRUD operations completed successfully!',
    );
  } catch (error) {
    console.log('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
  }
}

testVehicleModelCRUD();
