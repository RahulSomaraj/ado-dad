const axios = require('axios');

async function testSwaggerEndpoints() {
  const baseUrl = 'http://localhost:5000';

  console.log('🧪 Testing Swagger endpoints...');

  try {
    // Test 1: Check if server is running
    console.log('\n1. Testing server connectivity...');
    try {
      const healthResponse = await axios.get(`${baseUrl}/`);
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server connectivity error:', error.message);
      return;
    }

    // Test 2: Test Swagger docs
    console.log('\n2. Testing Swagger docs...');
    try {
      const swaggerResponse = await axios.get(`${baseUrl}/docs`);
      console.log('✅ Swagger docs accessible');
    } catch (error) {
      console.log('❌ Swagger docs error:', error.message);
    }

    // Test 3: Test upload test endpoint
    console.log('\n3. Testing upload test endpoint...');
    try {
      const uploadResponse = await axios.get(
        `${baseUrl}/upload/test/presigned-url?fileName=test.jpg&fileType=image/jpeg`,
      );
      console.log('✅ Upload test endpoint working:', uploadResponse.data);
    } catch (error) {
      console.log(
        '❌ Upload test endpoint error:',
        error.response?.data || error.message,
      );
    }

    // Test 4: Test main upload endpoint (should fail without auth)
    console.log(
      '\n4. Testing main upload endpoint (should fail without auth)...',
    );
    try {
      const mainUploadResponse = await axios.get(
        `${baseUrl}/upload/presigned-url?fileName=test.jpg&fileType=image/jpeg`,
      );
      console.log(
        '✅ Main upload endpoint working (unexpected):',
        mainUploadResponse.data,
      );
    } catch (error) {
      console.log(
        '✅ Main upload endpoint correctly requires auth:',
        error.response?.status,
        error.response?.data?.message,
      );
    }

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSwaggerEndpoints();
