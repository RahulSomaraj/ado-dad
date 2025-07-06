const axios = require('axios');

async function testUpload() {
  try {
    console.log('🧪 Testing upload functionality...');

    // Test 1: Try to get presigned URL (should fail due to missing AWS credentials)
    console.log('\n1. Testing presigned URL generation...');
    try {
      const response = await axios.get(
        'http://localhost:5000/upload/presigned-url?fileName=test.jpg&fileType=image/jpeg',
      );
      console.log('✅ Presigned URL response:', response.data);
    } catch (error) {
      console.log(
        '❌ Presigned URL error:',
        error.response?.data || error.message,
      );
    }

    // Test 2: Test local file upload
    console.log('\n2. Testing local file upload...');
    const FormData = require('form-data');
    const fs = require('fs');
    const path = require('path');

    // Create a test file
    const testFilePath = path.join(__dirname, 'test-image.txt');
    fs.writeFileSync(testFilePath, 'This is a test image content');

    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath), {
      filename: 'test-image.txt',
      contentType: 'text/plain',
    });

    try {
      const uploadResponse = await axios.post(
        'http://localhost:5000/upload/file',
        form,
        {
          headers: {
            ...form.getHeaders(),
          },
        },
      );
      console.log('✅ Upload response:', uploadResponse.data);
    } catch (error) {
      console.log('❌ Upload error:', error.response?.data || error.message);
    }

    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    console.log('\n✅ Upload testing completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUpload();
