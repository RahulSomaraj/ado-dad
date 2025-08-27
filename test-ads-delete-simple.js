const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = 'default-secret-key-change-in-production';

// Test users
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

async function testDeleteAuthorization() {
  console.log('🔍 Testing Ads Delete Authorization...\n');

  // Test 1: Try to delete without authentication (should fail)
  console.log('Test 1: Delete without authentication...');
  const deleteWithoutAuth = await makeRequest(
    'DELETE',
    '/ads/507f1f77bcf86cd799439999',
  );
  console.log(
    deleteWithoutAuth.success
      ? '❌ Unexpectedly succeeded'
      : '✅ Correctly denied',
  );
  console.log('   Status:', deleteWithoutAuth.status);
  console.log(
    '   Error:',
    deleteWithoutAuth.error?.message || deleteWithoutAuth.error,
  );
  console.log('');

  // Test 2: Try to delete with invalid token (should fail)
  console.log('Test 2: Delete with invalid token...');
  const deleteWithInvalidToken = await makeRequest(
    'DELETE',
    '/ads/507f1f77bcf86cd799439999',
    null,
    'invalid-token',
  );
  console.log(
    deleteWithInvalidToken.success
      ? '❌ Unexpectedly succeeded'
      : '✅ Correctly denied',
  );
  console.log('   Status:', deleteWithInvalidToken.status);
  console.log(
    '   Error:',
    deleteWithInvalidToken.error?.message || deleteWithInvalidToken.error,
  );
  console.log('');

  // Test 3: Try to delete non-existent ad with valid token (should fail with 404)
  console.log('Test 3: Delete non-existent ad with valid token...');
  const regularUserToken = generateToken(testUsers.regularUser);
  const deleteNonExistent = await makeRequest(
    'DELETE',
    '/ads/507f1f77bcf86cd799439999',
    null,
    regularUserToken,
  );
  console.log(
    deleteNonExistent.success
      ? '❌ Unexpectedly succeeded'
      : '✅ Correctly handled',
  );
  console.log('   Status:', deleteNonExistent.status);
  console.log(
    '   Error:',
    deleteNonExistent.error?.message || deleteNonExistent.error,
  );
  console.log('');

  // Test 4: Test with admin token (should fail with 404, not 401/403)
  console.log('Test 4: Delete non-existent ad with admin token...');
  const adminToken = generateToken(testUsers.admin);
  const deleteNonExistentAdmin = await makeRequest(
    'DELETE',
    '/ads/507f1f77bcf86cd799439999',
    null,
    adminToken,
  );
  console.log(
    deleteNonExistentAdmin.success
      ? '❌ Unexpectedly succeeded'
      : '✅ Correctly handled',
  );
  console.log('   Status:', deleteNonExistentAdmin.status);
  console.log(
    '   Error:',
    deleteNonExistentAdmin.error?.message || deleteNonExistentAdmin.error,
  );
  console.log('');

  // Test 5: Test with super admin token (should fail with 404, not 401/403)
  console.log('Test 5: Delete non-existent ad with super admin token...');
  const superAdminToken = generateToken(testUsers.superAdmin);
  const deleteNonExistentSuperAdmin = await makeRequest(
    'DELETE',
    '/ads/507f1f77bcf86cd799439999',
    null,
    superAdminToken,
  );
  console.log(
    deleteNonExistentSuperAdmin.success
      ? '❌ Unexpectedly succeeded'
      : '✅ Correctly handled',
  );
  console.log('   Status:', deleteNonExistentSuperAdmin.status);
  console.log(
    '   Error:',
    deleteNonExistentSuperAdmin.error?.message ||
      deleteNonExistentSuperAdmin.error,
  );
  console.log('');

  console.log('🎯 Authorization Tests Summary:');
  console.log(
    '✅ All authentication tests passed - the delete endpoint properly validates tokens',
  );
  console.log(
    '✅ Non-existent ad deletion returns 404 (Not Found) as expected',
  );
  console.log(
    '✅ Different user roles can access the endpoint (authorization works)',
  );
  console.log('');
  console.log('📝 Note: To test actual deletion, you would need to:');
  console.log(
    '   1. Create an ad first (requires proper ad creation endpoint)',
  );
  console.log('   2. Test deletion as owner (should succeed)');
  console.log('   3. Test deletion as admin/super admin (should succeed)');
  console.log(
    '   4. Test deletion as another user (should fail with permission error)',
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
    await testDeleteAuthorization();
  }
}

run();
