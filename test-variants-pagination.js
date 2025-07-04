const http = require('http');

// Test the paginated variants endpoint
function testVariantsPagination() {
  console.log('=== Testing Vehicle Variants Pagination ===\n');

  // Test 1: Basic pagination
  console.log('1. Testing basic pagination (page 1, limit 5):');
  testEndpoint('/vehicle-inventory/variants?page=1&limit=5');

  // Test 2: With filters
  console.log('\n2. Testing with price filter (maxPrice 500000):');
  testEndpoint('/vehicle-inventory/variants?page=1&limit=3&maxPrice=500000');

  // Test 3: With sorting
  console.log('\n3. Testing with sorting (price DESC):');
  testEndpoint(
    '/vehicle-inventory/variants?page=1&limit=3&sortBy=price&sortOrder=DESC',
  );

  // Test 4: With search
  console.log('\n4. Testing with search (if text index exists):');
  testEndpoint('/vehicle-inventory/variants?page=1&limit=3&search=sedan');
}

function testEndpoint(path) {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: path,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const req = http.request(options, (res) => {
    console.log(`   Status: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.data) {
          console.log(`   Total: ${response.total}`);
          console.log(`   Page: ${response.page}/${response.totalPages}`);
          console.log(`   Items: ${response.data.length}`);
          console.log(`   Has Next: ${response.hasNext}`);
          console.log(`   Has Prev: ${response.hasPrev}`);
          if (response.data.length > 0) {
            console.log(
              `   First item: ${response.data[0].name || response.data[0].displayName}`,
            );
          }
        } else {
          console.log('   Response:', JSON.stringify(response, null, 2));
        }
      } catch (e) {
        console.log('   Raw response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`   Error: ${e.message}`);
  });

  req.end();
}

// Run the tests
testVariantsPagination();
