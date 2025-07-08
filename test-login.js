const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testLogin() {
  console.log('🧪 Testing Login Flow...\n');

  const testCases = [
    {
      name: 'Super Admin Login',
      credentials: {
        username: 'superadmin@example.com',
        password: '123456',
      },
    },
    {
      name: 'Admin Login',
      credentials: {
        username: 'admin@example.com',
        password: '123456',
      },
    },
    {
      name: 'User Login',
      credentials: {
        username: 'user@example.com',
        password: '123456',
      },
    },
    {
      name: 'Showroom Login',
      credentials: {
        username: 'showroom@example.com',
        password: '123456',
      },
    },
    {
      name: 'Login with Phone Number',
      credentials: {
        username: '1212121212',
        password: '123456',
      },
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log(
      `🔑 Credentials: ${testCase.credentials.username} / ${testCase.credentials.password}`,
    );

    try {
      const response = await axios.post(
        `${BASE_URL}/auth/login`,
        testCase.credentials,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('✅ Login Successful!');
      console.log('📊 Response:', {
        status: response.status,
        userType: response.data.userType,
        email: response.data.email,
        hasToken: !!response.data.token,
        hasRefreshToken: !!response.data.refreshToken,
      });

      // Test protected endpoint with the token
      if (response.data.token) {
        try {
          const protectedResponse = await axios.get(
            `${BASE_URL}/vehicle-inventory/manufacturers`,
            {
              headers: {
                Authorization: response.data.token,
              },
            },
          );
          console.log('🔒 Protected endpoint test: ✅ SUCCESS');
        } catch (protectedError) {
          console.log('🔒 Protected endpoint test: ❌ FAILED');
          console.log(
            '   Error:',
            protectedError.response?.data || protectedError.message,
          );
        }
      }
    } catch (error) {
      console.log('❌ Login Failed!');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data || error.message);
    }
  }

  console.log('\n🧪 Login Flow Test Complete!');
}

// Run the test
testLogin().catch(console.error);
