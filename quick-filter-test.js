const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function quickTest() {
  console.log('🧪 QUICK FILTER VERIFICATION...\n');
  
  const tests = [
    { name: 'All Ads', params: {} },
    { name: 'Private Vehicle Only', params: { category: 'private_vehicle' } },
    { name: 'Commercial Vehicle Only', params: { category: 'commercial_vehicle' } },
    { name: 'Property Only', params: { category: 'property' } },
    { name: 'Manufacturer Filter', params: { manufacturerId: '686fb37cab966c7e18f263f8' } },
    { name: 'Location Mumbai', params: { location: 'Mumbai' } },
    { name: 'Year 2019+', params: { minYear: 2019 } },
    { name: 'Color White', params: { color: 'White' } },
    { name: 'Price Range 500k-1M', params: { minPrice: 500000, maxPrice: 1000000 } }
  ];
  
  for (const test of tests) {
    try {
      console.log(`🔍 Testing: ${test.name}`);
      const response = await axios.get(`${BASE_URL}/ads`, {
        params: test.params,
        timeout: 5000
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
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('🎯 QUICK TEST COMPLETE!');
}

quickTest();
