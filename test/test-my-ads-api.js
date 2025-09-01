const axios = require('axios');
const chalk = require('chalk');

// Configuration
const BASE_URL = 'http://localhost:5000';
const API_ENDPOINT = '/ads/my-ads';

// Test data for different scenarios
const testScenarios = [
  {
    name: 'Basic My Ads Request',
    description: 'Get all ads for authenticated user',
    filters: {},
    expectedStatus: 200,
  },
  {
    name: 'Filtered by Category',
    description: 'Get only property ads for user',
    filters: { category: 'property' },
    expectedStatus: 200,
  },
  {
    name: 'Filtered by Price Range',
    description: 'Get ads within specific price range',
    filters: { minPrice: 100000, maxPrice: 500000 },
    expectedStatus: 200,
  },
  {
    name: 'Filtered by Location',
    description: 'Get ads from specific location',
    filters: { location: 'Mumbai' },
    expectedStatus: 200,
  },
  {
    name: 'Filtered by Status',
    description: 'Get only active ads',
    filters: { isActive: true },
    expectedStatus: 200,
  },
  {
    name: 'Search with Text',
    description: 'Search ads by text in title/description',
    filters: { search: 'apartment' },
    expectedStatus: 200,
  },
  {
    name: 'Pagination Test',
    description: 'Get first page with 5 items',
    filters: { page: 1, limit: 5 },
    expectedStatus: 200,
  },
  {
    name: 'Sorting Test',
    description: 'Sort by price ascending',
    filters: { sortBy: 'price', sortOrder: 'ASC' },
    expectedStatus: 200,
  },
  {
    name: 'Combined Filters',
    description: 'Multiple filters combined',
    filters: { 
      category: 'property', 
      minPrice: 200000, 
      maxPrice: 800000,
      location: 'Delhi',
      isActive: true,
      page: 1,
      limit: 10
    },
    expectedStatus: 200,
  },
];

// Helper function to make authenticated request
async function makeAuthenticatedRequest(filters = {}) {
  try {
    // Note: In a real scenario, you would need to:
    // 1. Login first to get a JWT token
    // 2. Include the token in the Authorization header
    // 3. For this demo, we'll show the expected request structure
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE', // Replace with actual token
    };

    const response = await axios.get(`${BASE_URL}${API_ENDPOINT}`, {
      headers,
      params: filters, // Query parameters for GET request
    });

    return {
      success: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    if (error.response) {
      return {
        success: false,
        status: error.response.status,
        error: error.response.data,
      };
    }
    return {
      success: false,
      status: 'NETWORK_ERROR',
      error: error.message,
    };
  }
}

// Helper function to display test results
function displayTestResult(scenario, result) {
  console.log(chalk.blue(`\n🧪 ${scenario.name}`));
  console.log(chalk.gray(`   ${scenario.description}`));
  
  if (result.success) {
    console.log(chalk.green(`   ✅ Status: ${result.status}`));
    
    if (result.data) {
      const { data, total, page, limit, totalPages, hasNext, hasPrev } = result.data;
      console.log(chalk.cyan(`   📊 Results: ${data?.length || 0} ads`));
      console.log(chalk.cyan(`   📄 Page: ${page}/${totalPages} (${limit} per page)`));
      console.log(chalk.cyan(`   🔢 Total: ${total} ads`));
      console.log(chalk.cyan(`   ➡️  Has Next: ${hasNext}`));
      console.log(chalk.cyan(`   ⬅️  Has Prev: ${hasPrev}`));
      
      // Show sample ad if available
      if (data && data.length > 0) {
        const sampleAd = data[0];
        console.log(chalk.yellow(`   📝 Sample Ad:`));
        console.log(chalk.yellow(`      ID: ${sampleAd.id}`));
        console.log(chalk.yellow(`      Category: ${sampleAd.category}`));
        console.log(chalk.yellow(`      Price: ₹${sampleAd.price?.toLocaleString()}`));
        console.log(chalk.yellow(`      Location: ${sampleAd.location}`));
        console.log(chalk.yellow(`      Posted: ${new Date(sampleAd.postedAt).toLocaleDateString()}`));
      }
    }
  } else {
    console.log(chalk.red(`   ❌ Status: ${result.status}`));
    if (result.error) {
      console.log(chalk.red(`   Error: ${JSON.stringify(result.error, null, 2)}`));
    }
  }
}

// Main test execution
async function runTests() {
  console.log(chalk.bold.blue('\n🚀 Testing "Get My Ads" API Endpoint'));
  console.log(chalk.gray(`   Base URL: ${BASE_URL}`));
  console.log(chalk.gray(`   Endpoint: ${API_ENDPOINT}`));
  console.log(chalk.gray(`   Total Scenarios: ${testScenarios.length}`));
  
  console.log(chalk.yellow('\n⚠️  Note: This is a demonstration script.'));
  console.log(chalk.yellow('   To test with real data, you need to:'));
  console.log(chalk.yellow('   1. Start your NestJS server'));
  console.log(chalk.yellow('   2. Login to get a JWT token'));
  console.log(chalk.yellow('   3. Replace YOUR_JWT_TOKEN_HERE with actual token'));
  console.log(chalk.yellow('   4. Ensure you have ads posted by the authenticated user'));
  
  console.log(chalk.cyan('\n📋 Test Scenarios:'));
  testScenarios.forEach((scenario, index) => {
    console.log(chalk.cyan(`   ${index + 1}. ${scenario.name}`));
  });

  console.log(chalk.green('\n✅ API Features:'));
  console.log(chalk.green('   • Authentication required (JWT token)'));
  console.log(chalk.green('   • Returns only ads posted by authenticated user'));
  console.log(chalk.green('   • Supports all standard filters (category, price, location, etc.)'));
  console.log(chalk.green('   • Full pagination support'));
  console.log(chalk.green('   • Sorting options'));
  console.log(chalk.green('   • Text search across title and description'));
  console.log(chalk.green('   • Includes detailed ad information'));
  console.log(chalk.green('   • Redis caching for performance'));
  
  console.log(chalk.blue('\n🔧 Usage Examples:'));
  console.log(chalk.blue('   GET /ads/my-ads'));
  console.log(chalk.blue('   GET /ads/my-ads?category=property&page=1&limit=10'));
  console.log(chalk.blue('   GET /ads/my-ads?minPrice=100000&maxPrice=500000'));
  console.log(chalk.blue('   GET /ads/my-ads?search=apartment&location=Mumbai'));
  console.log(chalk.blue('   GET /ads/my-ads?sortBy=price&sortOrder=ASC'));
  
  console.log(chalk.magenta('\n📚 API Documentation:'));
  console.log(chalk.magenta('   • Swagger UI: http://localhost:5000/api'));
  console.log(chalk.magenta('   • Endpoint: GET /ads/my-ads'));
  console.log(chalk.magenta('   • Authentication: Bearer token required'));
  console.log(chalk.magenta('   • Response: PaginatedDetailedAdResponseDto'));
  
  console.log(chalk.gray('\n📝 Response Structure:'));
  console.log(chalk.gray('   {'));
  console.log(chalk.gray('     data: DetailedAdResponseDto[],'));
  console.log(chalk.gray('     total: number,'));
  console.log(chalk.gray('     page: number,'));
  console.log(chalk.gray('     limit: number,'));
  console.log(chalk.gray('     totalPages: number,'));
  console.log(chalk.gray('     hasNext: boolean,'));
  console.log(chalk.gray('     hasPrev: boolean'));
  console.log(chalk.gray('   }'));
  
  // Run test scenarios (these will fail without authentication, but show the structure)
  console.log(chalk.yellow('\n🧪 Running Test Scenarios (will fail without auth):'));
  
  for (const scenario of testScenarios) {
    const result = await makeAuthenticatedRequest(scenario.filters);
    displayTestResult(scenario, result);
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(chalk.bold.green('\n🎉 Test demonstration completed!'));
  console.log(chalk.gray('\nTo run real tests:'));
  console.log(chalk.gray('1. npm run start:dev'));
  console.log(chalk.gray('2. Login to get JWT token'));
  console.log(chalk.gray('3. Update the script with real token'));
  console.log(chalk.gray('4. Run: node test/test-my-ads-api.js'));
}

// Handle process termination
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🛑 Test interrupted by user'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n🛑 Test terminated'));
  process.exit(0);
});

// Run the tests
runTests().catch((error) => {
  console.error(chalk.red('\n❌ Test execution failed:'), error);
  process.exit(1);
});
