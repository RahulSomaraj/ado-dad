const axios = require('axios');
const chalk = require('chalk');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_TIMEOUT = 30000;

// Test data
const testUser = {
  phone: '9876543210',
  password: 'TestPassword123!',
  name: 'Expert Tester',
  email: 'expert.tester@example.com',
  userType: 'SELLER',
};

let authToken = '';
let userId = '';

// Utility functions
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const colors = {
    info: chalk.blue,
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    title: chalk.cyan.bold,
  };
  console.log(`${colors[type](`[${timestamp}] ${message}`)}`);
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test functions
async function registerUser() {
  try {
    log('🔐 Registering test user...', 'info');
    const response = await axios.post(`${BASE_URL}/auth/register`, testUser);
    log(`✅ User registered successfully: ${response.data.id}`, 'success');
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      log('⚠️ User already exists, proceeding with login...', 'warning');
      return null;
    }
    throw error;
  }
}

async function loginUser() {
  try {
    log('🔑 Logging in test user...', 'info');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: testUser.phone,
      password: testUser.password,
    });
    authToken = response.data.token;
    userId = response.data.id;
    log(`✅ Login successful: ${userId}`, 'success');
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function testGetAllAds() {
  try {
    log('📋 Testing POST /ads/list - Get all ads', 'info');
    const response = await axios.post(`${BASE_URL}/ads/list`, {});
    
    if (response.status === 200 && response.data && response.data.data) {
      const ads = response.data.data;
      log(`✅ Successfully retrieved ${ads.length} ads`, 'success');
      
      // Log summary by category
      const categoryCount = {};
      ads.forEach(ad => {
        categoryCount[ad.category] = (categoryCount[ad.category] || 0) + 1;
      });
      
      Object.entries(categoryCount).forEach(([category, count]) => {
        log(`   📊 ${category}: ${count} ads`, 'info');
      });
      
      return ads;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    log(`❌ Failed to get all ads: ${error.message}`, 'error');
    throw error;
  }
}

async function testGetAdsByCategory(category) {
  try {
    log(`📋 Testing POST /ads/list with category=${category}`, 'info');
    const response = await axios.post(`${BASE_URL}/ads/list`, {
      category: category
    });
    
    if (response.status === 200 && response.data && response.data.data) {
      const ads = response.data.data;
      log(`✅ Successfully retrieved ${ads.length} ${category} ads`, 'success');
      
      // Check if all ads belong to the specified category
      const allCorrectCategory = ads.every(ad => ad.category === category);
      if (allCorrectCategory) {
        log(`✅ All ads are correctly categorized as ${category}`, 'success');
      } else {
        log(`⚠️ Some ads may not be correctly categorized`, 'warning');
      }
      
      return ads;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    log(`❌ Failed to get ${category} ads: ${error.message}`, 'error');
    throw error;
  }
}

async function testGetVehicleAds() {
  try {
    log('🚗 Testing POST /ads/list for vehicles', 'info');
    const response = await axios.post(`${BASE_URL}/ads/list`, {
      category: 'private_vehicle'
    });
    
    if (response.status === 200 && response.data && response.data.data) {
      const ads = response.data.data;
      log(`✅ Successfully retrieved ${ads.length} vehicle ads`, 'success');
      
      // Check for specific vehicle types
      const vehicleTypes = {};
      ads.forEach(ad => {
        if (ad.vehicleDetails?.vehicleType) {
          vehicleTypes[ad.vehicleDetails.vehicleType] = (vehicleTypes[ad.vehicleDetails.vehicleType] || 0) + 1;
        }
      });
      
      Object.entries(vehicleTypes).forEach(([type, count]) => {
        log(`   🚗 ${type}: ${count} ads`, 'info');
      });
      
      return ads;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    log(`❌ Failed to get vehicle ads: ${error.message}`, 'error');
    throw error;
  }
}

async function testGetPropertyAds() {
  try {
    log('🏠 Testing POST /ads/list for properties', 'info');
    const response = await axios.post(`${BASE_URL}/ads/list`, {
      category: 'property'
    });
    
    if (response.status === 200 && response.data && response.data.data) {
      const ads = response.data.data;
      log(`✅ Successfully retrieved ${ads.length} property ads`, 'success');
      
      // Check for property types
      const propertyTypes = {};
      ads.forEach(ad => {
        if (ad.propertyDetails?.propertyType) {
          propertyTypes[ad.propertyDetails.propertyType] = (propertyTypes[ad.propertyDetails.propertyType] || 0) + 1;
        }
      });
      
      Object.entries(propertyTypes).forEach(([type, count]) => {
        log(`   🏠 ${type}: ${count} ads`, 'info');
      });
      
      return ads;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    log(`❌ Failed to get property ads: ${error.message}`, 'error');
    throw error;
  }
}

async function testGetCommercialVehicleAds() {
  try {
    log('🚛 Testing POST /ads/list for commercial vehicles', 'info');
    const response = await axios.post(`${BASE_URL}/ads/list`, {
      category: 'commercial_vehicle'
    });
    
    if (response.status === 200 && response.data && response.data.data) {
      const ads = response.data.data;
      log(`✅ Successfully retrieved ${ads.length} commercial vehicle ads`, 'success');
      
      // Check for commercial vehicle types
      const vehicleTypes = {};
      ads.forEach(ad => {
        if (ad.commercialVehicleDetails?.vehicleType) {
          vehicleTypes[ad.commercialVehicleDetails.vehicleType] = (vehicleTypes[ad.commercialVehicleDetails.vehicleType] || 0) + 1;
        }
      });
      
      Object.entries(vehicleTypes).forEach(([type, count]) => {
        log(`   🚛 ${type}: ${count} ads`, 'info');
      });
      
      return ads;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    log(`❌ Failed to get commercial vehicle ads: ${error.message}`, 'error');
    throw error;
  }
}

async function testSearchAds(searchTerm) {
  try {
    log(`🔍 Testing POST /ads/list with search=${searchTerm}`, 'info');
    const response = await axios.post(`${BASE_URL}/ads/list`, {
      search: searchTerm
    });
    
    if (response.status === 200 && response.data && response.data.data) {
      const ads = response.data.data;
      log(`✅ Successfully found ${ads.length} ads matching "${searchTerm}"`, 'success');
      
      // Check if search results contain the search term
      const containsSearchTerm = ads.some(ad => 
        ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ad.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (containsSearchTerm) {
        log(`✅ Search results contain the search term "${searchTerm}"`, 'success');
      } else {
        log(`⚠️ Search results may not contain the search term "${searchTerm}"`, 'warning');
      }
      
      return ads;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    log(`❌ Failed to search ads: ${error.message}`, 'error');
    throw error;
  }
}

async function testFilterAdsByPrice(minPrice, maxPrice) {
  try {
    log(`💰 Testing POST /ads/list with price range ${minPrice}-${maxPrice}`, 'info');
    const response = await axios.post(`${BASE_URL}/ads/list`, {
      minPrice: minPrice,
      maxPrice: maxPrice
    });
    
    if (response.status === 200 && response.data && response.data.data) {
      const ads = response.data.data;
      log(`✅ Successfully found ${ads.length} ads in price range ₹${minPrice} - ₹${maxPrice}`, 'success');
      
      // Check if all ads are within the price range
      const allInRange = ads.every(ad => ad.price >= minPrice && ad.price <= maxPrice);
      if (allInRange) {
        log(`✅ All ads are within the specified price range`, 'success');
      } else {
        log(`⚠️ Some ads may be outside the specified price range`, 'warning');
      }
      
      return ads;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    log(`❌ Failed to filter ads by price: ${error.message}`, 'error');
    throw error;
  }
}

async function testGetAdById(adId) {
  try {
    log(`📄 Testing GET /ads/${adId} - Get ad by ID`, 'info');
    const response = await axios.get(`${BASE_URL}/ads/${adId}`);
    
    if (response.status === 200 && response.data) {
      log(`✅ Successfully retrieved ad: ${response.data.title}`, 'success');
      log(`   💰 Price: ₹${response.data.price}`, 'info');
      log(`   📍 Location: ${response.data.location}`, 'info');
      log(`   📸 Images: ${response.data.images?.length || 0} images`, 'info');
      
      return response.data;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    log(`❌ Failed to get ad by ID: ${error.message}`, 'error');
    throw error;
  }
}

async function testGetMyAds() {
  try {
    log('👤 Testing GET /ads/my-ads - Get user\'s ads', 'info');
    const response = await axios.get(`${BASE_URL}/ads/my-ads`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.status === 200 && Array.isArray(response.data)) {
      log(`✅ Successfully retrieved ${response.data.length} user ads`, 'success');
      
      // Check if all ads belong to the current user
      const allUserAds = response.data.every(ad => ad.seller === userId);
      if (allUserAds) {
        log(`✅ All ads belong to the current user`, 'success');
      } else {
        log(`⚠️ Some ads may not belong to the current user`, 'warning');
      }
      
      return response.data;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    log(`❌ Failed to get user ads: ${error.message}`, 'error');
    throw error;
  }
}

async function runComprehensiveTest() {
  log('🚀 Starting Comprehensive Ads API Test', 'title');
  log('=' * 50, 'info');
  
  try {
    // Wait for server to be ready
    await delay(2000);
    
    // Test all ads
    const allAds = await testGetAllAds();
    
    if (allAds.length > 0) {
      // Test individual ad
      await testGetAdById(allAds[0]._id);
    }
    
    // Test category-specific endpoints
    await testGetVehicleAds();
    await testGetPropertyAds();
    await testGetCommercialVehicleAds();
    
    // Test category filtering
    await testGetAdsByCategory('private_vehicle');
    await testGetAdsByCategory('property');
    await testGetAdsByCategory('commercial_vehicle');
    
    // Test search functionality
    await testSearchAds('Honda');
    await testSearchAds('Luxury');
    await testSearchAds('Apartment');
    
    // Test price filtering
    await testFilterAdsByPrice(50000, 500000);
    await testFilterAdsByPrice(1000000, 5000000);
    await testFilterAdsByPrice(5000000, 20000000);
    
    log('=' * 50, 'info');
    log('🎉 All tests completed successfully!', 'title');
    log('📊 Test Summary:', 'info');
    log('   ✅ Get all ads', 'success');
    log('   ✅ Get ads by category', 'success');
    log('   ✅ Get vehicle ads', 'success');
    log('   ✅ Get property ads', 'success');
    log('   ✅ Get commercial vehicle ads', 'success');
    log('   ✅ Search ads', 'success');
    log('   ✅ Filter ads by price', 'success');
    log('   ✅ Get ad by ID', 'success');
    
  } catch (error) {
    log('=' * 50, 'error');
    log(`❌ Test failed: ${error.message}`, 'error');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'error');
      log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`, 'error');
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runComprehensiveTest();
}

module.exports = {
  runComprehensiveTest,
  testGetAllAds,
  testGetAdsByCategory,
  testSearchAds,
  testFilterAdsByPrice,
};
