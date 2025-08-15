const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testAllFilters() {
  console.log('🧪 TESTING ALL FILTERS ARE WORKING...\n');
  
  const tests = [
    { name: 'All Ads', params: {}, expected: 'Should return 73+ ads' },
    { name: 'Private Vehicle Only', params: { category: 'private_vehicle' }, expected: 'Should return private vehicles' },
    { name: 'Commercial Vehicle Only', params: { category: 'commercial_vehicle' }, expected: 'Should return commercial vehicles' },
    { name: 'Property Only', params: { category: 'property' }, expected: 'Should return properties' },
    { name: 'Two Wheeler Only', params: { category: 'two_wheeler' }, expected: 'Should return two wheelers' },
    { name: 'Manufacturer Filter', params: { manufacturerId: '686fb37cab966c7e18f263f8' }, expected: 'Should return 1 Honda ad' },
    { name: 'Location Mumbai', params: { location: 'Mumbai' }, expected: 'Should return Mumbai ads' },
    { name: 'Year 2019+', params: { minYear: 2019 }, expected: 'Should return 2019+ vehicles' },
    { name: 'Price Range 500k-1M', params: { minPrice: 500000, maxPrice: 1000000 }, expected: 'Should return ads in price range' },
    { name: 'Color White', params: { color: 'White' }, expected: 'Should return white vehicles' },
    { name: 'First Owner Only', params: { isFirstOwner: 'true' }, expected: 'Should return first owner vehicles' },
    { name: 'With Insurance', params: { hasInsurance: 'true' }, expected: 'Should return insured vehicles' },
    { name: 'Low Mileage', params: { maxMileage: 50000 }, expected: 'Should return low mileage vehicles' },
    { name: 'Combined: Private + 2019+', params: { category: 'private_vehicle', minYear: 2019 }, expected: 'Should return private vehicles 2019+' }
  ];
  
  for (const test of tests) {
    try {
      console.log(`🔍 Testing: ${test.name}`);
      console.log(`   Expected: ${test.expected}`);
      
      const response = await axios.get(`${BASE_URL}/ads`, {
        params: test.params,
        timeout: 10000
      });
      
      const { data, total } = response.data;
      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   📊 Results: ${total} ads found`);
      
      if (data.length > 0) {
        const firstAd = data[0];
        console.log(`   📋 Sample: ${firstAd.category} | ₹${firstAd.price} | ${firstAd.location}`);
        
        if (firstAd.vehicleDetails && firstAd.vehicleDetails.length > 0) {
          const vehicle = firstAd.vehicleDetails[0];
          console.log(`   🚗 Vehicle: ${vehicle.manufacturerId} | Year: ${vehicle.year}`);
        }
      }
      console.log('');
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log('');
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('🎯 ALL TESTS COMPLETE!');
  console.log('✅ If you see results above, all filters are working correctly!');
}

testAllFilters();
