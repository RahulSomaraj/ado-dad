const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function verifyFilter(filterName, filterParams, expectedBehavior) {
  try {
    console.log(`\n🔍 Verifying ${filterName}...`);
    console.log(`📝 Expected: ${expectedBehavior}`);
    console.log(`🔧 Parameters:`, JSON.stringify(filterParams, null, 2));
    
    const response = await axios.get(`${BASE_URL}/ads`, {
      params: filterParams,
      timeout: 10000
    });
    
    const { data, total } = response.data;
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Results: ${total} ads found`);
    
    if (data.length > 0) {
      console.log(`📋 First 3 ads:`);
      data.slice(0, 3).forEach((ad, index) => {
        console.log(`   ${index + 1}. ID: ${ad.id}`);
        console.log(`      Category: ${ad.category}`);
        console.log(`      Price: ${ad.price}`);
        console.log(`      Location: ${ad.location}`);
        
        if (ad.vehicleDetails && ad.vehicleDetails.length > 0) {
          const vehicle = ad.vehicleDetails[0];
          console.log(`      Vehicle: ${vehicle.manufacturerId} | ${vehicle.modelId} | Year: ${vehicle.year}`);
        }
        console.log('');
      });
    } else {
      console.log(`❌ No ads found`);
    }
    
    return { success: true, total, data: data.length };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runVerificationTests() {
  console.log('🧪 VERIFYING FILTERS ARE ACTUALLY WORKING...\n');
  
  const tests = [
    {
      name: '1. All Ads (Baseline)',
      params: {},
      expected: 'Should return all 73+ ads'
    },
    {
      name: '2. Private Vehicle Only',
      params: { category: 'private_vehicle' },
      expected: 'Should return ONLY private_vehicle ads (36 ads)'
    },
    {
      name: '3. Commercial Vehicle Only',
      params: { category: 'commercial_vehicle' },
      expected: 'Should return ONLY commercial_vehicle ads (8 ads)'
    },
    {
      name: '4. Property Only',
      params: { category: 'property' },
      expected: 'Should return ONLY property ads (4 ads)'
    },
    {
      name: '5. Price Range 500k-1M',
      params: { minPrice: 500000, maxPrice: 1000000 },
      expected: 'Should return ads with price between 500k-1M (17 ads)'
    },
    {
      name: '6. Specific Manufacturer',
      params: { manufacturerId: '686fb37cab966c7e18f263f8' },
      expected: 'Should return ONLY ads with this manufacturer (1 ad)'
    },
    {
      name: '7. Location Mumbai',
      params: { location: 'Mumbai' },
      expected: 'Should return ONLY ads with Mumbai in location (22 ads)'
    },
    {
      name: '8. Year 2019+',
      params: { minYear: 2019 },
      expected: 'Should return ONLY ads with year 2019 or newer (44 ads)'
    },
    {
      name: '9. Year 2019 or older',
      params: { maxYear: 2019 },
      expected: 'Should return ONLY ads with year 2019 or older (24 ads)'
    },
    {
      name: '10. Combined: Private Vehicle + 2019+',
      params: { category: 'private_vehicle', minYear: 2019 },
      expected: 'Should return private vehicles from 2019+ (26 ads)'
    },
    {
      name: '11. Color White',
      params: { color: 'White' },
      expected: 'Should return ONLY vehicles with White color (21 ads)'
    },
    {
      name: '12. First Owner Only',
      params: { isFirstOwner: 'true' },
      expected: 'Should return ONLY first owner vehicles (11 ads)'
    },
    {
      name: '13. With Insurance',
      params: { hasInsurance: 'true' },
      expected: 'Should return ONLY vehicles with insurance (16 ads)'
    },
    {
      name: '14. Low Mileage (under 50k)',
      params: { maxMileage: 50000 },
      expected: 'Should return vehicles with mileage under 50k (49 ads)'
    }
  ];
  
  for (const test of tests) {
    await verifyFilter(test.name, test.params, test.expected);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between tests
  }
  
  console.log('\n🎯 VERIFICATION COMPLETE!');
  console.log('Check the results above to confirm filters are working correctly.');
}

// Run verification
setTimeout(async () => {
  try {
    await runVerificationTests();
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}, 2000);

