const axios = require('axios');

async function testDatabaseLookup() {
  try {
    console.log('🔍 Testing Database Lookup Operations...\n');
    
    const baseURL = 'http://localhost:5001';
    const manufacturerId = '686fb37cab966c7e18f263f8';
    const hondaAdId = '689db5ad4ac1b812b8257ea4';

    // Test 1: Check if the Honda ad exists in vehicleads collection
    console.log('1. Checking vehicleads collection...');
    try {
      // Let's test a direct query to see what's in the vehicleads collection
      const vehicleAdsResponse = await axios.get(`${baseURL}/ads?category=private_vehicle&limit=5`);
      console.log(`✅ Found ${vehicleAdsResponse.data.total} vehicle ads`);
      
      if (vehicleAdsResponse.data.data.length > 0) {
        console.log('📋 Sample vehicle ads:');
        vehicleAdsResponse.data.data.forEach((ad, index) => {
          console.log(`   ${index + 1}. ID: ${ad.id}`);
          console.log(`      Category: ${ad.category}`);
          console.log(`      Has vehicleDetails: ${ad.vehicleDetails ? 'Yes' : 'No'}`);
          if (ad.vehicleDetails && ad.vehicleDetails.length > 0) {
            console.log(`      VehicleDetails length: ${ad.vehicleDetails.length}`);
            console.log(`      First vehicleDetail:`, JSON.stringify(ad.vehicleDetails[0], null, 2));
          }
        });
      }
    } catch (error) {
      console.log('❌ Error checking vehicleads:', error.response?.data || error.message);
    }

    // Test 2: Check the specific Honda ad with detailed response
    console.log('\n2. Checking specific Honda ad details...');
    try {
      const hondaResponse = await axios.get(`${baseURL}/ads/${hondaAdId}`);
      console.log('✅ Honda ad full response:');
      console.log(JSON.stringify(hondaResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Error getting Honda ad details:', error.response?.data || error.message);
    }

    // Test 3: Test the manufacturerId filter with detailed logging
    console.log('\n3. Testing manufacturerId filter with detailed response...');
    try {
      const filterResponse = await axios.get(`${baseURL}/ads?manufacturerId=${manufacturerId}&limit=5`);
      console.log('✅ Filter response:');
      console.log(`   Status: ${filterResponse.status}`);
      console.log(`   Data length: ${filterResponse.data.data.length}`);
      console.log(`   Total: ${filterResponse.data.total}`);
      
      if (filterResponse.data.data.length > 0) {
        console.log('📋 Filtered ad details:');
        console.log(JSON.stringify(filterResponse.data.data[0], null, 2));
      }
    } catch (error) {
      console.log('❌ Error with manufacturerId filter:', error.response?.data || error.message);
    }

    // Test 4: Check if there's a mismatch in the database
    console.log('\n4. Checking for database mismatches...');
    try {
      // Get all ads and check which ones should have vehicleDetails
      const allAdsResponse = await axios.get(`${baseURL}/ads?limit=20`);
      const vehicleAds = allAdsResponse.data.data.filter(ad => 
        ad.category === 'private_vehicle' || ad.category === 'commercial_vehicle'
      );
      
      console.log(`📊 Found ${vehicleAds.length} vehicle ads out of ${allAdsResponse.data.data.length} total ads`);
      
      const adsWithVehicleDetails = vehicleAds.filter(ad => 
        ad.vehicleDetails && ad.vehicleDetails.length > 0
      );
      
      console.log(`📊 Vehicle ads with vehicleDetails: ${adsWithVehicleDetails.length}`);
      console.log(`📊 Vehicle ads WITHOUT vehicleDetails: ${vehicleAds.length - adsWithVehicleDetails.length}`);
      
      if (adsWithVehicleDetails.length > 0) {
        console.log('✅ Some vehicle ads DO have vehicleDetails:');
        adsWithVehicleDetails.slice(0, 3).forEach((ad, index) => {
          console.log(`   ${index + 1}. ID: ${ad.id}`);
          console.log(`      Manufacturer ID: ${ad.vehicleDetails[0].manufacturerId}`);
        });
      }
    } catch (error) {
      console.log('❌ Error checking database mismatches:', error.response?.data || error.message);
    }

    console.log('\n✅ Database lookup testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDatabaseLookup();

