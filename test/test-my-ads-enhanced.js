const axios = require('axios');
const chalk = require('chalk');

const BASE_URL = 'http://localhost:5000';

// Replace with a real JWT token for testing
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE';

async function testMyAdsEndpoint() {
  console.log(chalk.blue('🚀 Testing Enhanced My Ads Endpoint'));
  console.log(chalk.gray('=====================================\n'));

  if (JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.log(
      chalk.yellow(
        '⚠️  Please replace JWT_TOKEN with a real token to test authentication',
      ),
    );
    console.log(
      chalk.gray(
        '   You can get a token by logging in through your auth endpoint\n',
      ),
    );
    return;
  }

  const headers = {
    Authorization: `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json',
  };

  try {
    // Test 1: Basic pagination
    console.log(chalk.cyan('📋 Test 1: Basic Pagination'));
    const basicResponse = await axios.post(
      `${BASE_URL}/ads/my-ads`,
      {
        page: 1,
        limit: 5,
      },
      { headers },
    );

    console.log(chalk.green('✅ Basic pagination successful'));
    console.log(chalk.gray(`   Found ${basicResponse.data.total} total ads`));
    console.log(
      chalk.gray(
        `   Showing ${basicResponse.data.data.length} ads on page ${basicResponse.data.page}`,
      ),
    );
    console.log(
      chalk.gray(`   Total pages: ${basicResponse.data.totalPages}\n`),
    );

    // Test 2: Search by title
    console.log(chalk.cyan('🔍 Test 2: Search by Title'));
    const searchResponse = await axios.post(
      `${BASE_URL}/ads/my-ads`,
      {
        search: 'Splendor',
        page: 1,
        limit: 10,
      },
      { headers },
    );

    console.log(chalk.green('✅ Search by title successful'));
    console.log(
      chalk.gray(
        `   Found ${searchResponse.data.total} ads matching "Splendor"`,
      ),
    );
    if (searchResponse.data.data.length > 0) {
      console.log(
        chalk.gray(`   First result: ${searchResponse.data.data[0].title}`),
      );
    }
    console.log('');

    // Test 3: Search by manufacturer
    console.log(chalk.cyan('🏭 Test 3: Search by Manufacturer'));
    const manufacturerResponse = await axios.post(
      `${BASE_URL}/ads/my-ads`,
      {
        search: 'Honda',
        page: 1,
        limit: 10,
      },
      { headers },
    );

    console.log(chalk.green('✅ Search by manufacturer successful'));
    console.log(
      chalk.gray(
        `   Found ${manufacturerResponse.data.total} ads matching "Honda"`,
      ),
    );
    console.log('');

    // Test 4: Sort by price (ascending)
    console.log(chalk.cyan('💰 Test 4: Sort by Price (Ascending)'));
    const sortPriceResponse = await axios.post(
      `${BASE_URL}/ads/my-ads`,
      {
        sortBy: 'price',
        sortOrder: 'ASC',
        page: 1,
        limit: 5,
      },
      { headers },
    );

    console.log(chalk.green('✅ Sort by price successful'));
    console.log(
      chalk.gray(
        `   Showing ${sortPriceResponse.data.data.length} ads sorted by price (low to high)`,
      ),
    );
    if (sortPriceResponse.data.data.length > 0) {
      console.log(
        chalk.gray(`   Lowest price: ₹${sortPriceResponse.data.data[0].price}`),
      );
      console.log(
        chalk.gray(
          `   Highest price: ₹${sortPriceResponse.data.data[sortPriceResponse.data.data.length - 1].price}`,
        ),
      );
    }
    console.log('');

    // Test 5: Sort by title (alphabetical)
    console.log(chalk.cyan('📝 Test 5: Sort by Title (Alphabetical)'));
    const sortTitleResponse = await axios.post(
      `${BASE_URL}/ads/my-ads`,
      {
        sortBy: 'title',
        sortOrder: 'ASC',
        page: 1,
        limit: 5,
      },
      { headers },
    );

    console.log(chalk.green('✅ Sort by title successful'));
    console.log(
      chalk.gray(
        `   Showing ${sortTitleResponse.data.data.length} ads sorted by title (A-Z)`,
      ),
    );
    if (sortTitleResponse.data.data.length > 0) {
      console.log(
        chalk.gray(`   First title: ${sortTitleResponse.data.data[0].title}`),
      );
      console.log(
        chalk.gray(
          `   Last title: ${sortTitleResponse.data.data[sortTitleResponse.data.data.length - 1].title}`,
        ),
      );
    }
    console.log('');

    // Test 6: Combined search and sort
    console.log(chalk.cyan('🎯 Test 6: Combined Search and Sort'));
    const combinedResponse = await axios.post(
      `${BASE_URL}/ads/my-ads`,
      {
        search: 'car',
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        page: 1,
        limit: 3,
      },
      { headers },
    );

    console.log(chalk.green('✅ Combined search and sort successful'));
    console.log(
      chalk.gray(
        `   Found ${combinedResponse.data.total} ads matching "car" sorted by newest first`,
      ),
    );
    console.log('');

    // Test 7: Search by model/variant
    console.log(chalk.cyan('🚗 Test 7: Search by Model/Variant'));
    const modelResponse = await axios.post(
      `${BASE_URL}/ads/my-ads`,
      {
        search: 'Swift',
        page: 1,
        limit: 10,
      },
      { headers },
    );

    console.log(chalk.green('✅ Search by model successful'));
    console.log(
      chalk.gray(`   Found ${modelResponse.data.total} ads matching "Swift"`),
    );
    console.log('');

    console.log(chalk.green('🎉 All tests completed successfully!'));
    console.log(chalk.gray('\n📚 Available Features:'));
    console.log(chalk.gray('   • Pagination: page, limit'));
    console.log(chalk.gray('   • Search: title, manufacturer, model, variant'));
    console.log(chalk.gray('   • Sorting: createdAt, title, price, updatedAt'));
    console.log(chalk.gray('   • Sort Order: ASC, DESC'));
  } catch (error) {
    console.error(chalk.red('❌ Error testing my-ads endpoint:'));
    if (error.response) {
      console.error(chalk.red(`   Status: ${error.response.status}`));
      console.error(
        chalk.red(
          `   Message: ${error.response.data?.message || error.response.statusText}`,
        ),
      );
    } else {
      console.error(chalk.red(`   ${error.message}`));
    }
  }
}

// Run the test
testMyAdsEndpoint();
