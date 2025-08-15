const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function debugManufacturerFilter() {
  console.log('🔍 DEBUGGING MANUFACTURER FILTER...\n');
  
  // Test 1: Get all ads and check manufacturer IDs
  console.log('1️⃣ Getting all ads to check manufacturer IDs...');
  try {
    const response = await axios.get(`${BASE_URL}/ads?limit=20`);
    const ads = response.data.data;
    
    console.log(`📊 Found ${ads.length} ads`);
    
    // Extract all manufacturer IDs from vehicle ads
    const manufacturerIds = new Set();
    const vehicleAds = ads.filter(ad => 
      ad.vehicleDetails && ad.vehicleDetails.length > 0
    );
    
    vehicleAds.forEach((ad, index) => {
      const vehicle = ad.vehicleDetails[0];
      manufacturerIds.add(vehicle.manufacturerId);
      console.log(`   Ad ${index + 1}: ${ad.category} | Manufacturer: ${vehicle.manufacturerId} | Year: ${vehicle.year}`);
    });
    
    console.log(`\n📋 Unique Manufacturer IDs found:`);
    Array.from(manufacturerIds).forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });
    
    // Test 2: Try filtering with the first manufacturer ID
    if (manufacturerIds.size > 0) {
      const firstManufacturerId = Array.from(manufacturerIds)[0];
      console.log(`\n2️⃣ Testing filter with manufacturer ID: ${firstManufacturerId}`);
      
      const filterResponse = await axios.get(`${BASE_URL}/ads?manufacturerId=${firstManufacturerId}&limit=5`);
      console.log(`   Filter result: ${filterResponse.data.total} ads found`);
      
      if (filterResponse.data.data.length > 0) {
        console.log(`   ✅ Filter working! Found ads:`);
        filterResponse.data.data.forEach((ad, index) => {
          console.log(`      ${index + 1}. ${ad.category} | ${ad.vehicleDetails[0].manufacturerId}`);
        });
      } else {
        console.log(`   ❌ Filter not working - no ads found`);
      }
    }
    
    // Test 3: Check the problematic manufacturer ID
    console.log(`\n3️⃣ Testing your problematic manufacturer ID: 686fb37cab966c7e18f26417`);
    try {
      const problematicResponse = await axios.get(`${BASE_URL}/ads?manufacturerId=686fb37cab966c7e18f26417&limit=5`);
      console.log(`   Result: ${problematicResponse.data.total} ads found`);
      
      if (problematicResponse.data.total === 0) {
        console.log(`   ❌ No ads found with this manufacturer ID`);
        console.log(`   💡 This manufacturer ID doesn't exist in your current data`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

debugManufacturerFilter();
