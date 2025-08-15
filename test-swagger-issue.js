const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testSwaggerIssue() {
  console.log('🔍 TESTING SWAGGER UI ISSUE...\n');
  
  // Test 1: Simple request (should work)
  console.log('1️⃣ Testing: GET /ads (no filters)');
  try {
    const response1 = await axios.get(`${BASE_URL}/ads?limit=5`);
    console.log(`   ✅ Status: ${response1.status}`);
    console.log(`   📊 Total: ${response1.data.total}`);
    console.log(`   📋 Data length: ${response1.data.data.length}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('');
  
  // Test 2: Manufacturer filter (should work)
  console.log('2️⃣ Testing: GET /ads with manufacturerId filter');
  try {
    const response2 = await axios.get(`${BASE_URL}/ads?manufacturerId=686fb37cab966c7e18f263f8&limit=5`);
    console.log(`   ✅ Status: ${response2.status}`);
    console.log(`   📊 Total: ${response2.data.total}`);
    console.log(`   📋 Data length: ${response2.data.data.length}`);
    
    if (response2.data.data.length > 0) {
      const ad = response2.data.data[0];
      console.log(`   🚗 Found: ${ad.category} | ₹${ad.price} | ${ad.location}`);
      if (ad.vehicleDetails && ad.vehicleDetails.length > 0) {
        console.log(`   📝 Vehicle: ${ad.vehicleDetails[0].manufacturerId} | Year: ${ad.vehicleDetails[0].year}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('');
  
  // Test 3: Complex filters (from your terminal log)
  console.log('3️⃣ Testing: GET /ads with complex filters (from your terminal log)');
  try {
    const complexFilters = {
      isActive: true,
      isFurnished: true,
      hasParking: true,
      hasGarden: false,
      isFirstOwner: true,
      hasInsurance: true,
      hasRcBook: true,
      hasFitness: true,
      hasPermit: true,
      limit: 5
    };
    
    const response3 = await axios.get(`${BASE_URL}/ads`, { params: complexFilters });
    console.log(`   ✅ Status: ${response3.status}`);
    console.log(`   📊 Total: ${response3.data.total}`);
    console.log(`   📋 Data length: ${response3.data.data.length}`);
    
    if (response3.data.data.length > 0) {
      console.log(`   📋 Sample ads found:`);
      response3.data.data.slice(0, 3).forEach((ad, index) => {
        console.log(`      ${index + 1}. ${ad.category} | ₹${ad.price} | ${ad.location}`);
      });
    } else {
      console.log(`   ⚠️  No ads found with these complex filters`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('');
  console.log('🎯 SWAGGER UI TROUBLESHOOTING TIPS:');
  console.log('1. Clear browser cache (Ctrl+Shift+R)');
  console.log('2. Try incognito/private browsing mode');
  console.log('3. Check browser developer tools (F12) for network errors');
  console.log('4. Verify the URL parameters are being sent correctly');
  console.log('5. Try copying the curl command from Swagger and running it manually');
}

testSwaggerIssue();
