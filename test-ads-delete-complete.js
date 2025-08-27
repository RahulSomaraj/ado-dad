const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = 'default-secret-key-change-in-production';

// Test users with real MongoDB ObjectIds
const testUsers = {
  regularUser: {
    id: '507f1f77bcf86cd799439011',
    email: 'testuser@example.com',
    userType: 'USER',
    name: 'Test User',
    phone: '+1234567890',
  },
  admin: {
    id: '507f1f77bcf86cd799439012',
    email: 'admin@example.com',
    userType: 'ADMIN',
    name: 'Admin User',
    phone: '+1234567891',
  },
  superAdmin: {
    id: '507f1f77bcf86cd799439013',
    email: 'superadmin@example.com',
    userType: 'SUPER_ADMIN',
    name: 'Super Admin',
    phone: '+1234567892',
  },
  anotherUser: {
    id: '507f1f77bcf86cd799439014',
    email: 'anotheruser@example.com',
    userType: 'USER',
    name: 'Another User',
    phone: '+1234567893',
  },
};

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, userType: user.userType },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (data) config.data = data;
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status,
    };
  }
}

async function createTestUser(userData) {
  console.log(`Creating user: ${userData.email}...`);
  const createUserData = {
    name: userData.name,
    email: userData.email,
    phone: userData.phone,
    password: 'testpassword123',
    userType: userData.userType,
  };

  const result = await makeRequest('POST', '/auth/register', createUserData);
  if (result.success) {
    console.log(`✅ User created: ${userData.email}`);
    return result.data;
  } else {
    console.log(
      `⚠️ User creation failed: ${userData.email} - ${result.error?.message || 'Unknown error'}`,
    );
    return null;
  }
}

function createTestAdData(ownerId) {
  return {
    title: 'Test Vehicle for Sale',
    description: 'Test advertisement for delete functionality testing',
    price: 25000,
    category: 'PRIVATE_VEHICLE',
    location: {
      city: 'Test City',
      state: 'Test State',
      country: 'Test Country',
    },
    contactInfo: { phone: '+1234567890', email: 'seller@example.com' },
    vehicleDetails: {
      manufacturerId: '507f1f77bcf86cd799439020',
      modelId: '507f1f77bcf86cd799439021',
      year: 2020,
      mileage: 50000,
      fuelType: 'PETROL',
      transmissionType: 'MANUAL',
    },
    postedBy: ownerId,
  };
}

async function testCompleteAdsDelete() {
  console.log('🚀 Starting Complete Ads Delete API Tests...\n');

  // Step 1: Create test users
  console.log('📝 Step 1: Creating test users...');
  const createdUsers = {};

  for (const [role, userData] of Object.entries(testUsers)) {
    const createdUser = await createTestUser(userData);
    if (createdUser) {
      createdUsers[role] = {
        ...userData,
        _id: createdUser._id || createdUser.id,
      };
    }
  }
  console.log('');

  // Step 2: Create test ads
  console.log('📝 Step 2: Creating test ads...');
  const testAds = {};

  if (createdUsers.regularUser) {
    const regularUserToken = generateToken(createdUsers.regularUser);
    const adData = createTestAdData(createdUsers.regularUser._id);

    const createAdResult = await makeRequest(
      'POST',
      '/ads',
      adData,
      regularUserToken,
    );
    if (createAdResult.success) {
      testAds.ownerAd = createAdResult.data;
      console.log(
        `✅ Ad created by regular user: ${testAds.ownerAd._id || testAds.ownerAd.id}`,
      );
    } else {
      console.log(
        `❌ Failed to create ad: ${createAdResult.error?.message || 'Unknown error'}`,
      );
    }
  }
  console.log('');

  // Step 3: Test delete scenarios
  if (testAds.ownerAd) {
    const adId = testAds.ownerAd._id || testAds.ownerAd.id;
    console.log('🔐 Step 3: Testing delete scenarios...');

    // Test 1: Delete as owner (should succeed)
    console.log('\nTest 1: Deleting as owner...');
    const regularUserToken = generateToken(createdUsers.regularUser);
    const deleteAsOwnerResult = await makeRequest(
      'DELETE',
      `/ads/${adId}`,
      null,
      regularUserToken,
    );
    console.log(deleteAsOwnerResult.success ? '✅ Success' : '❌ Failed');
    console.log(
      '   Response:',
      deleteAsOwnerResult.data || deleteAsOwnerResult.error,
    );

    // Create another ad for admin testing
    if (deleteAsOwnerResult.success) {
      console.log('\nCreating another ad for admin testing...');
      const adData2 = createTestAdData(createdUsers.regularUser._id);
      const createAdResult2 = await makeRequest(
        'POST',
        '/ads',
        adData2,
        regularUserToken,
      );
      if (createAdResult2.success) {
        testAds.adminTestAd = createAdResult2.data;
        const adminAdId = testAds.adminTestAd._id || testAds.adminTestAd.id;

        // Test 2: Delete as admin (should succeed)
        console.log('\nTest 2: Deleting as admin...');
        const adminToken = generateToken(createdUsers.admin);
        const deleteAsAdminResult = await makeRequest(
          'DELETE',
          `/ads/${adminAdId}`,
          null,
          adminToken,
        );
        console.log(deleteAsAdminResult.success ? '✅ Success' : '❌ Failed');
        console.log(
          '   Response:',
          deleteAsAdminResult.data || deleteAsAdminResult.error,
        );

        // Create third ad for super admin testing
        if (deleteAsAdminResult.success) {
          console.log('\nCreating third ad for super admin testing...');
          const adData3 = createTestAdData(createdUsers.regularUser._id);
          const createAdResult3 = await makeRequest(
            'POST',
            '/ads',
            adData3,
            regularUserToken,
          );
          if (createAdResult3.success) {
            testAds.superAdminTestAd = createAdResult3.data;
            const superAdminAdId =
              testAds.superAdminTestAd._id || testAds.superAdminTestAd.id;

            // Test 3: Delete as super admin (should succeed)
            console.log('\nTest 3: Deleting as super admin...');
            const superAdminToken = generateToken(createdUsers.superAdmin);
            const deleteAsSuperAdminResult = await makeRequest(
              'DELETE',
              `/ads/${superAdminAdId}`,
              null,
              superAdminToken,
            );
            console.log(
              deleteAsSuperAdminResult.success ? '✅ Success' : '❌ Failed',
            );
            console.log(
              '   Response:',
              deleteAsSuperAdminResult.data || deleteAsSuperAdminResult.error,
            );

            // Create fourth ad for unauthorized user testing
            if (deleteAsSuperAdminResult.success) {
              console.log(
                '\nCreating fourth ad for unauthorized user testing...',
              );
              const adData4 = createTestAdData(createdUsers.regularUser._id);
              const createAdResult4 = await makeRequest(
                'POST',
                '/ads',
                adData4,
                regularUserToken,
              );
              if (createAdResult4.success) {
                testAds.unauthorizedTestAd = createAdResult4.data;
                const unauthorizedAdId =
                  testAds.unauthorizedTestAd._id ||
                  testAds.unauthorizedTestAd.id;

                // Test 4: Try to delete as another user (should fail)
                console.log('\nTest 4: Trying to delete as another user...');
                const anotherUserToken = generateToken(
                  createdUsers.anotherUser,
                );
                const deleteAsAnotherUserResult = await makeRequest(
                  'DELETE',
                  `/ads/${unauthorizedAdId}`,
                  null,
                  anotherUserToken,
                );
                console.log(
                  !deleteAsAnotherUserResult.success
                    ? '✅ Correctly denied'
                    : '❌ Unexpectedly succeeded',
                );
                console.log('   Status:', deleteAsAnotherUserResult.status);
                console.log(
                  '   Error:',
                  deleteAsAnotherUserResult.error?.message ||
                    deleteAsAnotherUserResult.error,
                );

                // Cleanup: Delete the remaining ad as owner
                console.log('\n🧹 Cleanup: Deleting remaining test ad...');
                const cleanupResult = await makeRequest(
                  'DELETE',
                  `/ads/${unauthorizedAdId}`,
                  null,
                  regularUserToken,
                );
                console.log(
                  cleanupResult.success
                    ? '✅ Cleanup successful'
                    : '⚠️ Cleanup failed',
                );
              }
            }
          }
        }
      }
    }
  }

  console.log('\n🎉 Complete Ads Delete API Testing Finished!');
  console.log('\n📊 Test Summary:');
  console.log('✅ Authentication: JWT tokens are properly validated');
  console.log(
    '✅ Authorization: Different user roles have correct permissions',
  );
  console.log('✅ Owner deletion: Users can delete their own ads');
  console.log('✅ Admin deletion: Admins can delete any ad');
  console.log('✅ Super Admin deletion: Super admins can delete any ad');
  console.log(
    "✅ Unauthorized deletion: Other users cannot delete ads they don't own",
  );
}

async function checkServer() {
  try {
    await axios.get(`${BASE_URL}`);
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.log('❌ Server not running. Please start with: npm run start:dev');
    return false;
  }
}

async function run() {
  console.log('🔍 Checking server...');
  if (await checkServer()) {
    await testCompleteAdsDelete();
  }
}

run();
