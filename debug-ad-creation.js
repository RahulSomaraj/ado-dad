const axios = require('axios');

async function debugAdCreation() {
  try {
    console.log('🔍 Debugging Ad Creation Issue...\n');
    
    const baseURL = 'http://localhost:5000';

    // Test 1: Check if server is running
    console.log('1. Checking server status...');
    try {
      const healthResponse = await axios.get(`${baseURL}/ads?limit=1`);
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server is not running:', error.message);
      return;
    }

    // Test 2: Get current ad count
    console.log('\n2. Getting current ad count...');
    try {
      const countResponse = await axios.get(`${baseURL}/ads?limit=1`);
      console.log(`📊 Current ads count: ${countResponse.data.total}`);
    } catch (error) {
      console.log('❌ Error getting ad count:', error.response?.data || error.message);
    }

    // Test 3: Create a test vehicle ad
    console.log('\n3. Creating test vehicle ad...');
    try {
      const testAdData = {
        category: "private_vehicle",
        data: {
          description: "Test vehicle ad for debugging",
          price: 500000,
          location: "Test Location",
          images: [],
          vehicleType: "four_wheeler",
          manufacturerId: "507f1f77bcf86cd799439011", // Dummy ID
          modelId: "507f1f77bcf86cd799439012", // Dummy ID
          year: 2020,
          mileage: 50000,
          transmissionTypeId: "507f1f77bcf86cd799439013", // Dummy ID
          fuelTypeId: "507f1f77bcf86cd799439014", // Dummy ID
          color: "Red",
          isFirstOwner: true,
          hasInsurance: true,
          hasRcBook: true,
          additionalFeatures: ["Test Feature"]
        }
      };

      console.log('📝 Test ad data:', JSON.stringify(testAdData, null, 2));
      
      const createResponse = await axios.post(`${baseURL}/ads`, testAdData);
      console.log('✅ Ad creation response:', createResponse.data);
      
      // Test 4: Check if ad was created
      console.log('\n4. Checking if ad was created...');
      const newCountResponse = await axios.get(`${baseURL}/ads?limit=1`);
      console.log(`📊 New ads count: ${newCountResponse.data.total}`);
      
      if (newCountResponse.data.total > countResponse.data.total) {
        console.log('✅ Ad count increased - ad was created successfully');
      } else {
        console.log('❌ Ad count did not increase - ad creation failed');
      }
      
    } catch (error) {
      console.log('❌ Error creating test ad:', error.response?.data || error.message);
      
      if (error.response?.data?.message) {
        console.log('🔍 Error details:', error.response.data.message);
      }
    }

    console.log('\n✅ Debugging completed!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugAdCreation();
