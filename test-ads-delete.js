const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = 'default-secret-key-change-in-production';

const testUsers = {
  regularUser: {
    id: '507f1f77bcf86cd799439011',
    email: 'testuser@example.com',
    userType: 'USER',
  },
  admin: {
    id: '507f1f77bcf86cd799439012',
    email: 'admin@example.com',
    userType: 'ADMIN',
  },
  superAdmin: {
    id: '507f1f77bcf86cd799439013',
    email: 'superadmin@example.com',
    userType: 'SUPER_ADMIN',
  },
  anotherUser: {
    id: '507f1f77bcf86cd799439014',
    email: 'anotheruser@example.com',
    userType: 'USER',
  },
};

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, userType: user.userType },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

function createTestAdData() {
  return {
    title: 'Test Vehicle for Sale',
    description: 'Test advertisement for delete functionality',
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
  };
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

async function testAdsDelete() {
  console.log('Starting Ads Delete API Tests...\n');

  // Test 1: Create ad as regular user
  console.log('Test 1: Creating ad as regular user...');
  const regularUserToken = generateToken(testUsers.regularUser);
  const createResult = await makeRequest(
    'POST',
    '/ads',
    createTestAdData(),
    regularUserToken,
  );

  if (!createResult.success) {
    console.log('Failed to create test ad:', createResult.error);
    return;
  }

  const adId = createResult.data._id || createResult.data.id;
  console.log('Ad created with ID:', adId);

  // Test 2: Delete as owner (should succeed)
  console.log('\nTest 2: Deleting as owner...');
  const deleteAsOwnerResult = await makeRequest(
    'DELETE',
    `/ads/${adId}`,
    null,
    regularUserToken,
  );
  console.log(
    deleteAsOwnerResult.success ? 'Success' : 'Failed:',
    deleteAsOwnerResult.error,
  );

  // Test 3: Create another ad
  console.log('\nTest 3: Creating another ad...');
  const createResult2 = await makeRequest(
    'POST',
    '/ads',
    createTestAdData(),
    regularUserToken,
  );
  const adId2 = createResult2.data._id || createResult2.data.id;

  // Test 4: Delete as admin (should succeed)
  console.log('\nTest 4: Deleting as admin...');
  const adminToken = generateToken(testUsers.admin);
  const deleteAsAdminResult = await makeRequest(
    'DELETE',
    `/ads/${adId2}`,
    null,
    adminToken,
  );
  console.log(
    deleteAsAdminResult.success ? 'Success' : 'Failed:',
    deleteAsAdminResult.error,
  );

  // Test 5: Create third ad
  console.log('\nTest 5: Creating third ad...');
  const createResult3 = await makeRequest(
    'POST',
    '/ads',
    createTestAdData(),
    regularUserToken,
  );
  const adId3 = createResult3.data._id || createResult3.data.id;

  // Test 6: Delete as super admin (should succeed)
  console.log('\nTest 6: Deleting as super admin...');
  const superAdminToken = generateToken(testUsers.superAdmin);
  const deleteAsSuperAdminResult = await makeRequest(
    'DELETE',
    `/ads/${adId3}`,
    null,
    superAdminToken,
  );
  console.log(
    deleteAsSuperAdminResult.success ? 'Success' : 'Failed:',
    deleteAsSuperAdminResult.error,
  );

  // Test 7: Create fourth ad
  console.log('\nTest 7: Creating fourth ad...');
  const createResult4 = await makeRequest(
    'POST',
    '/ads',
    createTestAdData(),
    regularUserToken,
  );
  const adId4 = createResult4.data._id || createResult4.data.id;

  // Test 8: Try to delete as another user (should fail)
  console.log('\nTest 8: Trying to delete as another user...');
  const anotherUserToken = generateToken(testUsers.anotherUser);
  const deleteAsAnotherUserResult = await makeRequest(
    'DELETE',
    `/ads/${adId4}`,
    null,
    anotherUserToken,
  );
  console.log(
    !deleteAsAnotherUserResult.success
      ? 'Correctly denied'
      : 'Unexpectedly succeeded',
  );

  // Test 9: Try to delete non-existent ad (should fail)
  console.log('\nTest 9: Trying to delete non-existent ad...');
  const deleteNonExistentResult = await makeRequest(
    'DELETE',
    '/ads/507f1f77bcf86cd799439999',
    null,
    regularUserToken,
  );
  console.log(
    !deleteNonExistentResult.success
      ? 'Correctly handled'
      : 'Unexpectedly succeeded',
  );

  // Test 10: Try to delete without auth (should fail)
  console.log('\nTest 10: Trying to delete without authentication...');
  const deleteWithoutAuthResult = await makeRequest(
    'DELETE',
    `/ads/${adId4}`,
    null,
  );
  console.log(
    !deleteWithoutAuthResult.success
      ? 'Correctly denied'
      : 'Unexpectedly succeeded',
  );

  // Cleanup
  console.log('\nCleanup: Deleting remaining test ad...');
  const cleanupResult = await makeRequest(
    'DELETE',
    `/ads/${adId4}`,
    null,
    regularUserToken,
  );
  console.log(cleanupResult.success ? 'Cleanup successful' : 'Cleanup failed');

  console.log('\nTesting completed!');
}

async function checkServer() {
  try {
    await axios.get(`${BASE_URL}`);
    console.log('Server is running');
    return true;
  } catch (error) {
    console.log('Server not running. Please start with: npm run start:dev');
    return false;
  }
}

async function run() {
  console.log('Checking server...');
  if (await checkServer()) {
    await testAdsDelete();
  }
}

run();
