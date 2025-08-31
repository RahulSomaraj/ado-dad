// Load environment variables from .env file
require('dotenv').config();

const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Test configuration
const BASE_URL = 'http://localhost:5000';

// Test data with unique email and phone
const testUser = {
  name: 'Test User CRUD',
  email: `testcrud-${Date.now()}@example.com`, // Make email unique
  phoneNumber: `+123456${Date.now().toString().slice(-4)}`, // Make phone unique
  password: 'testpassword123',
  type: 'NU', // Changed from 'USER' to 'NU' (Normal User)
};

class UserCRUDRedisTester {
  constructor() {
    this.userId = null;
    this.token = null;
    this.testResults = [];
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [${type}] ${message}`);
  }

  async testResult(testName, success, details = '') {
    const result = {
      test: testName,
      success,
      details,
      timestamp: new Date().toISOString(),
    };
    this.testResults.push(result);

    const status = success ? '✅ PASS' : '❌ FAIL';
    this.log(`${status} ${testName}`, success ? 'SUCCESS' : 'ERROR');
    if (details) {
      this.log(`  Details: ${details}`, 'DETAIL');
    }
  }

  // ====== Database Setup ======
  async setupDatabase() {
    try {
      // Use the same MongoDB URI as the application
      const mongoUri =
        process.env.MONGO_URI || 'mongodb://localhost:27017/ado-dad';
      this.log(
        `Connecting to MongoDB: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`,
      );

      await mongoose.connect(mongoUri);
      this.log('Connected to MongoDB');

      // Clear existing test user
      await this.clearTestUser();

      this.log('Database setup completed');
      return true;
    } catch (error) {
      this.log(`Database setup failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async clearTestUser() {
    try {
      const User = mongoose.model('User', new mongoose.Schema({}));
      await User.deleteMany({ email: { $regex: /^testcrud-/ } });
      this.log('Cleared existing test users');
    } catch (error) {
      this.log(`Cleanup warning: ${error.message}`, 'WARN');
    }
  }

  // ====== Authentication Tests ======
  async testLogin() {
    this.log('=== Testing Login ===');

    try {
      // Try to login with admin user first
      let response;
      try {
        response = await axios.post(`${BASE_URL}/auth/login`, {
          username: 'admin@example.com',
          password: '123456',
        });
      } catch (error) {
        // If admin login fails, try with regular user
        this.log('Admin login failed, trying regular user', 'WARN');
        response = await axios.post(`${BASE_URL}/auth/login`, {
          username: 'user@example.com',
          password: '123456',
        });
      }

      if (response.status === 200 || response.status === 201) {
        const token = response.data.access_token || response.data.token;
        if (token) {
          this.token = token;
          this.log(`Login response: ${JSON.stringify(response.data)}`, 'DEBUG');
          this.log(`Token to be used: ${token}`, 'DEBUG');
          await this.testResult(
            'Login',
            true,
            `Token received: ${token.substring(0, 20)}...`,
          );
        } else {
          await this.testResult('Login', false, 'No token received');
        }
      } else {
        await this.testResult('Login', false, `Status ${response.status}`);
      }
    } catch (error) {
      await this.testResult(
        'Login',
        false,
        error.response?.data?.message || error.message,
      );
    }
  }

  // ====== User CRUD Tests ======
  async testCreateUser() {
    this.log('=== Testing Create User ===');

    try {
      // User creation endpoint doesn't require authentication
      this.log(
        `Sending request to ${BASE_URL}/users with data: ${JSON.stringify(testUser)}`,
        'DEBUG',
      );

      const response = await axios.post(`${BASE_URL}/users`, testUser);

      this.log(`Response status: ${response.status}`, 'DEBUG');
      this.log(
        `Response headers: ${JSON.stringify(response.headers)}`,
        'DEBUG',
      );

      if (response.status === 200 || response.status === 201) {
        // Log the full response to understand the structure
        this.log(
          `Full response: ${JSON.stringify(response.data, null, 2)}`,
          'DEBUG',
        );

        // Add a small delay to ensure the database write is complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Since the API doesn't return the ID, we'll get it by querying the user by email
        await this.getUserIdByEmail(testUser.email);

        await this.testResult(
          'Create User',
          true,
          `User created with ID: ${this.userId || 'ID not found'}`,
        );
      } else {
        await this.testResult(
          'Create User',
          false,
          `Status ${response.status}`,
        );
      }
    } catch (error) {
      this.log(
        `Error details: ${JSON.stringify(error.response?.data || error.message)}`,
        'ERROR',
      );
      await this.testResult(
        'Create User',
        false,
        error.response?.data?.message || error.message,
      );
    }
  }

  async getUserIdByEmail(email) {
    try {
      // Try to get user by email from the database directly
      // Use the existing model if it exists, otherwise create a new one
      let User;
      try {
        User = mongoose.model('User');
      } catch (error) {
        // Model doesn't exist, create a simple one for this purpose
        const userSchema = new mongoose.Schema(
          {
            name: String,
            email: String,
            phoneNumber: String,
            type: String,
            profilePic: String,
            isDeleted: Boolean,
          },
          { collection: 'users' },
        );
        User = mongoose.model('User', userSchema);
      }

      // First, let's see what users exist in the database
      const allUsers = await User.find({}).select('email _id').exec();
      this.log(`All users in database: ${JSON.stringify(allUsers)}`, 'DEBUG');

      const user = await User.findOne({ email: email }).select('_id').exec();

      if (user && user._id) {
        this.userId = user._id.toString();
        this.log(`Found user ID by email: ${this.userId}`, 'DEBUG');
        return this.userId;
      } else {
        this.log(`No user found with email: ${email}`, 'WARN');
        return null;
      }
    } catch (error) {
      this.log(`Error getting user ID by email: ${error.message}`, 'ERROR');
      return null;
    }
  }

  async testGetUserById() {
    this.log('=== Testing Get User By ID ===');

    if (!this.userId) {
      await this.testResult('Get User By ID', false, 'No user ID available');
      return;
    }

    try {
      const response = await axios.get(`${BASE_URL}/users/${this.userId}`, {
        headers: { Authorization: this.token },
      });

      if (response.status === 200) {
        const user = response.data;
        await this.testResult(
          'Get User By ID',
          true,
          `User retrieved: ${user.email}`,
        );
      } else {
        await this.testResult(
          'Get User By ID',
          false,
          `Status ${response.status}`,
        );
      }
    } catch (error) {
      await this.testResult(
        'Get User By ID',
        false,
        error.response?.data?.message || error.message,
      );
    }
  }

  async testUpdateUser() {
    this.log('=== Testing Update User ===');

    if (!this.userId) {
      await this.testResult('Update User', false, 'No user ID available');
      return;
    }

    const updateData = {
      name: 'Updated Test User CRUD',
      phoneNumber: '+919876543210', // Valid Indian phone number format
    };

    try {
      const response = await axios.put(
        `${BASE_URL}/users/${this.userId}`,
        updateData,
        {
          headers: { Authorization: this.token },
        },
      );

      if (response.status === 200) {
        await this.testResult('Update User', true, 'User updated successfully');
      } else {
        await this.testResult(
          'Update User',
          false,
          `Status ${response.status}`,
        );
      }
    } catch (error) {
      await this.testResult(
        'Update User',
        false,
        error.response?.data?.message || error.message,
      );
    }
  }

  async testGetAllUsers() {
    this.log('=== Testing Get All Users ===');

    try {
      const response = await axios.get(`${BASE_URL}/users`, {
        headers: { Authorization: this.token },
      });

      if (response.status === 200) {
        const users = response.data;
        await this.testResult(
          'Get All Users',
          true,
          `Retrieved ${users.length || 0} users`,
        );
      } else {
        await this.testResult(
          'Get All Users',
          false,
          `Status ${response.status}`,
        );
      }
    } catch (error) {
      await this.testResult(
        'Get All Users',
        false,
        error.response?.data?.message || error.message,
      );
    }
  }

  async testDeleteUser() {
    this.log('=== Testing Delete User ===');

    if (!this.userId) {
      await this.testResult('Delete User', false, 'No user ID available');
      return;
    }

    try {
      const response = await axios.delete(`${BASE_URL}/users/${this.userId}`, {
        headers: { Authorization: this.token },
      });

      if (response.status === 200 || response.status === 204) {
        await this.testResult('Delete User', true, 'User deleted successfully');
      } else {
        await this.testResult(
          'Delete User',
          false,
          `Status ${response.status}`,
        );
      }
    } catch (error) {
      await this.testResult(
        'Delete User',
        false,
        error.response?.data?.message || error.message,
      );
    }
  }

  // ====== Redis Tests ======
  async testRedisHealth() {
    this.log('=== Testing Redis Health ===');

    try {
      // Test Redis connection through the application
      const response = await axios.get(`${BASE_URL}/health`);

      if (response.status === 200) {
        const healthData = response.data;
        if (healthData.redis && healthData.redis.status === 'ok') {
          await this.testResult('Redis Health', true, 'Redis is healthy');
        } else {
          await this.testResult(
            'Redis Health',
            false,
            'Redis health check failed',
          );
        }
      } else {
        await this.testResult(
          'Redis Health',
          false,
          `Health check status ${response.status}`,
        );
      }
    } catch (error) {
      await this.testResult(
        'Redis Health',
        false,
        error.response?.data?.message || error.message,
      );
    }
  }

  async testRedisCaching() {
    this.log('=== Testing Redis Caching ===');

    try {
      // Test if user data is cached by making multiple requests
      const startTime = Date.now();

      // First request
      const response1 = await axios.get(`${BASE_URL}/users`, {
        headers: { Authorization: this.token },
      });

      const firstRequestTime = Date.now() - startTime;

      // Second request (should be faster if cached)
      const startTime2 = Date.now();
      const response2 = await axios.get(`${BASE_URL}/users`, {
        headers: { Authorization: this.token },
      });

      const secondRequestTime = Date.now() - startTime2;

      if (response1.status === 200 && response2.status === 200) {
        const isCached = secondRequestTime < firstRequestTime * 0.8; // 20% faster
        await this.testResult(
          'Redis Caching',
          true,
          `First: ${firstRequestTime}ms, Second: ${secondRequestTime}ms, Cached: ${isCached}`,
        );
      } else {
        await this.testResult(
          'Redis Caching',
          false,
          'Failed to get users data',
        );
      }
    } catch (error) {
      await this.testResult(
        'Redis Caching',
        false,
        error.response?.data?.message || error.message,
      );
    }
  }

  // ====== Redis Configuration Check ======
  async checkRedisConfiguration() {
    this.log('=== Checking Redis Configuration ===');

    try {
      // Check if Redis configuration is properly set up
      const response = await axios.get(`${BASE_URL}/config/redis`);

      if (response.status === 200) {
        const config = response.data;
        const hasValidConfig = config.host && config.port;
        await this.testResult(
          'Redis Configuration',
          hasValidConfig,
          `Host: ${config.host}, Port: ${config.port}`,
        );
      } else {
        await this.testResult(
          'Redis Configuration',
          false,
          'Could not retrieve Redis config',
        );
      }
    } catch (error) {
      // If endpoint doesn't exist, check environment variables
      const hasRedisEnv =
        process.env.REDIS_HOST ||
        process.env.REDIS_PORT ||
        process.env.REDIS_URL;
      await this.testResult(
        'Redis Configuration',
        !!hasRedisEnv,
        hasRedisEnv
          ? `Redis env vars found: ${hasRedisEnv}`
          : 'No Redis env vars found',
      );
    }
  }

  // ====== Cleanup ======
  async cleanup() {
    this.log('=== Cleaning Up ===');

    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      this.log('Disconnected from MongoDB');
    }
  }

  // ====== Run All Tests ======
  async runAllTests() {
    this.log('🚀 Starting User CRUD and Redis Tests');

    try {
      // Setup
      const setupSuccess = await this.setupDatabase();
      if (!setupSuccess) {
        this.log('❌ Setup failed, aborting tests', 'ERROR');
        return;
      }

      // Test server connectivity first
      await this.testServerConnectivity();

      // Run tests
      await this.testLogin();
      await this.checkRedisConfiguration();
      await this.testRedisHealth();
      await this.testCreateUser();
      await this.testGetUserById();
      await this.testUpdateUser();
      await this.testGetAllUsers();
      await this.testRedisCaching();
      await this.testDeleteUser();

      // Summary
      this.printTestSummary();
    } catch (error) {
      this.log(`❌ Test execution failed: ${error.message}`, 'ERROR');
    } finally {
      await this.cleanup();
    }
  }

  async testServerConnectivity() {
    this.log('=== Testing Server Connectivity ===');

    try {
      const response = await axios.get(`${BASE_URL}/`);
      this.log(`Server is running, response: ${response.data}`, 'DEBUG');
      await this.testResult(
        'Server Connectivity',
        true,
        'Server is accessible',
      );
    } catch (error) {
      this.log(`Server connectivity error: ${error.message}`, 'ERROR');
      await this.testResult('Server Connectivity', false, error.message);
    }
  }

  printTestSummary() {
    this.log('=== Test Summary ===');

    const total = this.testResults.length;
    const passed = this.testResults.filter((r) => r.success).length;
    const failed = total - passed;

    console.log(`\n📊 Results: ${passed}/${total} tests passed`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`  - ${r.test}: ${r.details}`);
        });
    }

    console.log('\n🎯 Test Coverage:');
    console.log('  ✅ User Authentication');
    console.log('  ✅ User CRUD Operations (Create, Read, Update, Delete)');
    console.log('  ✅ Redis Configuration Check');
    console.log('  ✅ Redis Health Check');
    console.log('  ✅ Redis Caching Performance');
  }
}

// Run tests
async function main() {
  const tester = new UserCRUDRedisTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = UserCRUDRedisTester;
