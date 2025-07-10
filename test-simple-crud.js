const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testVehicleInventoryCRUD() {
  console.log('🚗 Testing Vehicle Inventory CRUD Operations...\n');

  let authToken = null;
  let manufacturerId = null;
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

    // Step 2: Test Manufacturer CRUD
    console.log('\n🏭 Step 2: Testing Manufacturer CRUD...');

    // Create manufacturer
    console.log('📝 Creating manufacturer...');
    const uniqueId = Date.now();
    const manufacturerData = {
      name: `test-manufacturer-${uniqueId}`,
      displayName: `Test Manufacturer ${uniqueId}`,
      originCountry: 'India',
      description: 'A test manufacturer for testing purposes',
      logo: 'https://example.com/logo.png',
      website: 'https://www.testmanufacturer.com',
      foundedYear: 1990,
      headquarters: 'Mumbai, India',
      isActive: true,
    };

    const createManufacturerResponse = await axios.post(
      `${BASE_URL}/vehicle-inventory/manufacturers`,
      manufacturerData,
      {
        headers: { Authorization: authToken },
      },
    );

    manufacturerId = createManufacturerResponse.data._id;
    console.log('✅ Manufacturer created! ID:', manufacturerId);

    // Get all manufacturers
    console.log('📋 Getting all manufacturers...');
    const getManufacturersResponse = await axios.get(
      `${BASE_URL}/vehicle-inventory/manufacturers`,
      {
        headers: { Authorization: authToken },
      },
    );
    console.log(
      '✅ Found',
      getManufacturersResponse.data.data.length,
      'manufacturers',
    );

    // Get manufacturer by ID
    console.log('🔍 Getting manufacturer by ID...');
    const getManufacturerResponse = await axios.get(
      `${BASE_URL}/vehicle-inventory/manufacturers/${manufacturerId}`,
      {
        headers: { Authorization: authToken },
      },
    );
    console.log(
      '✅ Manufacturer retrieved:',
      getManufacturerResponse.data.displayName,
    );

    // Update manufacturer
    console.log('✏️ Updating manufacturer...');
    const updateData = {
      displayName: 'Updated Test Manufacturer',
      description: 'Updated description',
    };

    const updateManufacturerResponse = await axios.put(
      `${BASE_URL}/vehicle-inventory/manufacturers/${manufacturerId}`,
      updateData,
      {
        headers: { Authorization: authToken },
      },
    );
    console.log('✅ Manufacturer updated!');

    // Step 3: Test Vehicle Model CRUD
    console.log('\n🚗 Step 3: Testing Vehicle Model CRUD...');

    // Create vehicle model
    console.log('📝 Creating vehicle model...');
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

    // Step 4: Test Filtering
    console.log('\n🔍 Step 4: Testing Filtering...');

    // Filter manufacturers by country
    console.log('🌍 Filtering manufacturers by country...');
    const filterByCountryResponse = await axios.get(
      `${BASE_URL}/vehicle-inventory/manufacturers?country=India`,
      {
        headers: { Authorization: authToken },
      },
    );
    console.log(
      '✅ Found',
      filterByCountryResponse.data.data.length,
      'manufacturers in India',
    );

    // Filter models by manufacturer
    console.log('🏭 Filtering models by manufacturer...');
    const filterByManufacturerResponse = await axios.get(
      `${BASE_URL}/vehicle-inventory/models?manufacturerId=${manufacturerId}`,
      {
        headers: { Authorization: authToken },
      },
    );
    console.log(
      '✅ Found',
      filterByManufacturerResponse.data.data.length,
      'models for this manufacturer',
    );

    // Step 5: Cleanup (Delete)
    console.log('\n🧹 Step 5: Cleanup...');

    // Delete model
    console.log('🗑️ Deleting vehicle model...');
    await axios.delete(`${BASE_URL}/vehicle-inventory/models/${modelId}`, {
      headers: { Authorization: authToken },
    });
    console.log('✅ Vehicle model deleted!');

    // Delete manufacturer
    console.log('🗑️ Deleting manufacturer...');
    await axios.delete(
      `${BASE_URL}/vehicle-inventory/manufacturers/${manufacturerId}`,
      {
        headers: { Authorization: authToken },
      },
    );
    console.log('✅ Manufacturer deleted!');

    console.log('\n🎉 All CRUD tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('URL:', error.config?.url);
  }
}

// Run the test
testVehicleInventoryCRUD();
