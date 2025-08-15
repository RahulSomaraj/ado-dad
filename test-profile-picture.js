const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testProfilePicture() {
  try {
    console.log('🧪 Testing Profile Picture Functionality...\n');

    const baseURL = 'http://localhost:5000';

    // Test 1: Create user with profile picture URL
    console.log('1. Testing create user with profile picture URL...');
    try {
      const userWithUrl = {
        name: 'John Doe',
        phoneNumber: '+1234567890',
        email: 'john.doe@example.com',
        password: 'password123',
        type: 'NU',
        profilePic: 'https://example.com/profile.jpg'
      };

      const response = await axios.post(`${baseURL}/users`, userWithUrl);
      console.log('✅ User created with URL:', response.data);
    } catch (error) {
      console.log('❌ Error creating user with URL:', error.response?.data || error.message);
    }

    // Test 2: Create user with profile picture file upload
    console.log('\n2. Testing create user with profile picture file upload...');
    try {
      // Create a test image file
      const testImagePath = path.join(__dirname, 'test-profile.jpg');
      fs.writeFileSync(testImagePath, 'fake image data');

      const form = new FormData();
      form.append('name', 'Jane Smith');
      form.append('phoneNumber', '+1234567891');
      form.append('email', 'jane.smith@example.com');
      form.append('password', 'password123');
      form.append('type', 'NU');
      form.append('profilePic', fs.createReadStream(testImagePath), {
        filename: 'test-profile.jpg',
        contentType: 'image/jpeg',
      });

      const response = await axios.post(`${baseURL}/users/with-profile-picture`, form, {
        headers: {
          ...form.getHeaders(),
        },
      });
      console.log('✅ User created with file upload:', response.data);

      // Clean up test file
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
    } catch (error) {
      console.log('❌ Error creating user with file upload:', error.response?.data || error.message);
    }

    // Test 3: Login and update profile picture
    console.log('\n3. Testing profile picture update for existing user...');
    try {
      // First login to get auth token
      const loginResponse = await axios.post(`${baseURL}/auth/login`, {
        username: '1212121212',
        password: '123456',
      });

      const authToken = loginResponse.body.access_token;
      const userId = loginResponse.body.user._id;

      console.log('✅ Logged in successfully');

      // Create a new test image for update
      const updateImagePath = path.join(__dirname, 'update-profile.jpg');
      fs.writeFileSync(updateImagePath, 'updated image data');

      const updateForm = new FormData();
      updateForm.append('profilePic', fs.createReadStream(updateImagePath), {
        filename: 'update-profile.jpg',
        contentType: 'image/jpeg',
      });

      const updateResponse = await axios.post(`${baseURL}/users/profile-picture`, updateForm, {
        headers: {
          ...updateForm.getHeaders(),
          Authorization: `Bearer ${authToken}`,
        },
      });
      console.log('✅ Profile picture updated:', updateResponse.data);

      // Clean up test file
      if (fs.existsSync(updateImagePath)) {
        fs.unlinkSync(updateImagePath);
      }
    } catch (error) {
      console.log('❌ Error updating profile picture:', error.response?.data || error.message);
    }

    console.log('\n✅ Profile picture testing completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProfilePicture();

