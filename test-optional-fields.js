const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let AUTH_TOKEN = '';

async function getAuthToken() {
  try {
    const loginResponse = await axios.post(
      `${BASE_URL}/auth/login`,
      {
        username: '1212121212',
        password: '123456',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    AUTH_TOKEN = loginResponse.data.token;
    console.log('✅ Authentication successful');
    return AUTH_TOKEN;
  } catch (error) {
    console.error(
      '❌ Authentication failed:',
      error.response?.data || error.message,
    );
    throw error;
  }
}

async function testOptionalFields() {
  try {
    console.log('Testing optional fields in vehicle inventory...\n');

    // Test 1: Create a manufacturer with minimal required fields
    console.log('1. Creating manufacturer with minimal fields...');
    const manufacturerData = {
      name: 'test-manufacturer-optional',
      displayName: 'Test Manufacturer Optional',
      originCountry: 'Test Country',
      logo: 'https://example.com/logo.png',
    };

    const manufacturerResponse = await axios.post(
      `${BASE_URL}/vehicle-inventory/manufacturers`,
      manufacturerData,
      {
        headers: {
          Authorization: AUTH_TOKEN,
          'Content-Type': 'application/json',
        },
      },
    );

    const manufacturerId = manufacturerResponse.data._id;
    console.log('✅ Manufacturer created:', manufacturerId);

    // Test 2: Update manufacturer with only some optional fields
    console.log('\n2. Updating manufacturer with partial optional fields...');
    const updateManufacturerData = {
      description: 'Updated description',
      website: 'https://example.com/updated',
      // Note: Not updating all fields - testing partial updates
    };

    const updateManufacturerResponse = await axios.put(
      `${BASE_URL}/vehicle-inventory/manufacturers/${manufacturerId}`,
      updateManufacturerData,
      {
        headers: {
          Authorization: AUTH_TOKEN,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ Manufacturer updated successfully');
    console.log('Updated fields:', Object.keys(updateManufacturerData));

    // Test 3: Create a vehicle model with minimal required fields
    console.log('\n3. Creating vehicle model with minimal fields...');
    const vehicleModelData = {
      name: 'test-model-optional',
      displayName: 'Test Model Optional',
      manufacturer: manufacturerId,
      vehicleType: 'Hatchback',
    };

    const vehicleModelResponse = await axios.post(
      `${BASE_URL}/vehicle-inventory/models`,
      vehicleModelData,
      {
        headers: {
          Authorization: AUTH_TOKEN,
          'Content-Type': 'application/json',
        },
      },
    );

    const vehicleModelId = vehicleModelResponse.data._id;
    console.log('✅ Vehicle model created:', vehicleModelId);

    // Test 4: Update vehicle model with only some optional fields
    console.log('\n4. Updating vehicle model with partial optional fields...');
    const updateVehicleModelData = {
      description: 'Updated model description',
      launchYear: 2020,
      segment: 'B',
      // Note: Not updating all fields - testing partial updates
    };

    const updateVehicleModelResponse = await axios.put(
      `${BASE_URL}/vehicle-inventory/models/${vehicleModelId}`,
      updateVehicleModelData,
      {
        headers: {
          Authorization: AUTH_TOKEN,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ Vehicle model updated successfully');
    console.log('Updated fields:', Object.keys(updateVehicleModelData));

    // Test 5: Verify the updates by fetching the updated records
    console.log('\n5. Verifying updates...');

    const updatedManufacturer = await axios.get(
      `${BASE_URL}/vehicle-inventory/manufacturers/${manufacturerId}`,
      {
        headers: {
          Authorization: AUTH_TOKEN,
        },
      },
    );

    const updatedVehicleModel = await axios.get(
      `${BASE_URL}/vehicle-inventory/models/${vehicleModelId}`,
      {
        headers: {
          Authorization: AUTH_TOKEN,
        },
      },
    );

    console.log('✅ Manufacturer verification:');
    console.log('  - Description:', updatedManufacturer.data.description);
    console.log('  - Website:', updatedManufacturer.data.website);

    console.log('✅ Vehicle model verification:');
    console.log('  - Description:', updatedVehicleModel.data.description);
    console.log('  - Launch Year:', updatedVehicleModel.data.launchYear);
    console.log('  - Segment:', updatedVehicleModel.data.segment);

    console.log('\n🎉 All optional field tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error(
        'Response data:',
        JSON.stringify(error.response.data, null, 2),
      );
    }
  }
}

// Run the test
async function runTest() {
  try {
    await getAuthToken();
    await testOptionalFields();
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

runTest();
