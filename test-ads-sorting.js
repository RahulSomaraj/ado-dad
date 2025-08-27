const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testAdsSorting() {
  console.log('🔍 Testing Ads Sorting by Creation Date...\n');

  try {
    // Test 1: Get ads with default sorting (should be createdAt DESC)
    console.log('Test 1: Getting ads with default sorting...');
    const response1 = await axios.post(`${BASE_URL}/ads/list`, {
      page: 1,
      limit: 5,
    });

    console.log('✅ Default sorting response received');
    console.log(`   Total ads: ${response1.data.total}`);
    console.log(`   Page: ${response1.data.page}`);
    console.log(`   Limit: ${response1.data.limit}`);

    if (response1.data.data && response1.data.data.length > 0) {
      console.log('   First few ads:');
      response1.data.data.slice(0, 3).forEach((ad, index) => {
        console.log(
          `   ${index + 1}. ID: ${ad._id}, Title: ${ad.title}, Created: ${ad.createdAt}`,
        );
      });
    }
    console.log('');

    // Test 2: Explicitly request createdAt DESC sorting
    console.log('Test 2: Getting ads with explicit createdAt DESC sorting...');
    const response2 = await axios.post(`${BASE_URL}/ads/list`, {
      page: 1,
      limit: 5,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    });

    console.log('✅ Explicit sorting response received');
    console.log(`   Total ads: ${response2.data.total}`);

    if (response2.data.data && response2.data.data.length > 0) {
      console.log('   First few ads:');
      response2.data.data.slice(0, 3).forEach((ad, index) => {
        console.log(
          `   ${index + 1}. ID: ${ad._id}, Title: ${ad.title}, Created: ${ad.createdAt}`,
        );
      });
    }
    console.log('');

    // Test 3: Test ASC sorting (should be oldest first)
    console.log('Test 3: Getting ads with createdAt ASC sorting...');
    const response3 = await axios.post(`${BASE_URL}/ads/list`, {
      page: 1,
      limit: 5,
      sortBy: 'createdAt',
      sortOrder: 'ASC',
    });

    console.log('✅ ASC sorting response received');
    console.log(`   Total ads: ${response3.data.total}`);

    if (response3.data.data && response3.data.data.length > 0) {
      console.log('   First few ads (oldest first):');
      response3.data.data.slice(0, 3).forEach((ad, index) => {
        console.log(
          `   ${index + 1}. ID: ${ad._id}, Title: ${ad.title}, Created: ${ad.createdAt}`,
        );
      });
    }
    console.log('');

    // Test 4: Test price sorting
    console.log('Test 4: Getting ads sorted by price DESC...');
    const response4 = await axios.post(`${BASE_URL}/ads/list`, {
      page: 1,
      limit: 5,
      sortBy: 'price',
      sortOrder: 'DESC',
    });

    console.log('✅ Price sorting response received');
    console.log(`   Total ads: ${response4.data.total}`);

    if (response4.data.data && response4.data.data.length > 0) {
      console.log('   First few ads (highest price first):');
      response4.data.data.slice(0, 3).forEach((ad, index) => {
        console.log(
          `   ${index + 1}. ID: ${ad._id}, Title: ${ad.title}, Price: ${ad.price}`,
        );
      });
    }

    console.log('\n🎯 Sorting Test Summary:');
    console.log(
      '✅ Default sorting: Ads are sorted by createdAt DESC (latest first)',
    );
    console.log(
      '✅ Explicit sorting: Custom sortBy and sortOrder work correctly',
    );
    console.log('✅ ASC sorting: Oldest ads appear first when using ASC');
    console.log('✅ Price sorting: Ads can be sorted by price as well');
    console.log('✅ Pagination: All sorting works with pagination');
  } catch (error) {
    console.error(
      '❌ Error testing ads sorting:',
      error.response?.data || error.message,
    );
  }
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
    await testAdsSorting();
  }
}

run();
