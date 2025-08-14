const axios = require('axios');

async function testManufacturerFilter() {
  try {
    console.log('🧪 Testing Manufacturer ID Filter...\n');
    
    const baseURL = 'http://localhost:5001';
    const manufacturerId = '686fb37cab966c7e18f263f8';

    // Test 1: Get all ads first
    console.log('1. Getting all ads...');
    try {
      const allAdsResponse = await axios.get(`${baseURL}/ads?limit=5`);
      console.log(`✅ Found ${allAdsResponse.data.total} ads total`);
      
      if (allAdsResponse.data.data.length > 0) {
        console.log('📋 Sample ads:');
        allAdsResponse.data.data.forEach((ad, index) => {
          console.log(`   ${index + 1}. ID: ${ad.id}, Category: ${ad.category}`);
          if (ad.vehicleDetails && ad.vehicleDetails.length > 0) {
            console.log(`      Vehicle Manufacturer ID: ${ad.vehicleDetails[0].manufacturerId}`);
          }
        });
      }
    } catch (error) {
      console.log('❌ Error getting all ads:', error.response?.data || error.message);
    }

    // Test 2: Filter by manufacturerId
    console.log('\n2. Testing manufacturerId filter...');
    try {
      const filterResponse = await axios.get(`${baseURL}/ads?manufacturerId=${manufacturerId}&limit=10`);
      console.log(`✅ Filter response: ${filterResponse.data.data.length} ads found`);
      console.log(`   Total: ${filterResponse.data.total}`);
      
      if (filterResponse.data.data.length > 0) {
        console.log('📋 Filtered ads:');
        filterResponse.data.data.forEach((ad, index) => {
          console.log(`   ${index + 1}. ID: ${ad.id}, Category: ${ad.category}`);
          if (ad.vehicleDetails && ad.vehicleDetails.length > 0) {
            console.log(`      Vehicle Manufacturer ID: ${ad.vehicleDetails[0].manufacturerId}`);
          }
        });
      } else {
        console.log('❌ No ads found with this manufacturerId');
      }
    } catch (error) {
      console.log('❌ Error filtering by manufacturerId:', error.response?.data || error.message);
    }

    // Test 3: Get vehicle ads specifically
    console.log('\n3. Testing vehicle category with manufacturerId...');
    try {
      const vehicleFilterResponse = await axios.get(`${baseURL}/ads?category=private_vehicle&manufacturerId=${manufacturerId}&limit=10`);
      console.log(`✅ Vehicle filter response: ${vehicleFilterResponse.data.data.length} ads found`);
      console.log(`   Total: ${vehicleFilterResponse.data.total}`);
    } catch (error) {
      console.log('❌ Error filtering vehicles by manufacturerId:', error.response?.data || error.message);
    }

    // Test 4: Check if the manufacturerId exists in any ads
    console.log('\n4. Checking if manufacturerId exists in database...');
    try {
      const allVehicleAdsResponse = await axios.get(`${baseURL}/ads?category=private_vehicle&limit=20`);
      console.log(`✅ Found ${allVehicleAdsResponse.data.data.length} vehicle ads`);
      
      const adsWithManufacturer = allVehicleAdsResponse.data.data.filter(ad => 
        ad.vehicleDetails && 
        ad.vehicleDetails.length > 0 && 
        ad.vehicleDetails[0].manufacturerId === manufacturerId
      );
      
      console.log(`📊 Ads with manufacturerId ${manufacturerId}: ${adsWithManufacturer.length}`);
      
      if (adsWithManufacturer.length > 0) {
        console.log('📋 These ads have the manufacturerId:');
        adsWithManufacturer.forEach((ad, index) => {
          console.log(`   ${index + 1}. ID: ${ad.id}`);
        });
      } else {
        console.log('❌ No ads found with this manufacturerId in the database');
      }
    } catch (error) {
      console.log('❌ Error checking manufacturerId:', error.response?.data || error.message);
    }

    console.log('\n✅ Testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testManufacturerFilter();
