const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function debugManufacturerIds() {
  console.log('🔍 Debugging manufacturerIds filter\n');

  try {
    // Test 1: Basic commercial vehicle filter (should return some results)
    console.log('1️⃣ Testing basic commercial vehicle filter:');
    const basicFilter = {
      category: "commercial_vehicle"
    };
    
    const basicResponse = await axios.post(`${BASE_URL}/ads/filter`, basicFilter);
    console.log(`✅ Basic filter: ${basicResponse.data.total} ads found`);
    
    if (basicResponse.data.total > 0) {
      const sampleAd = basicResponse.data.data[0];
      console.log('Sample ad details:');
      console.log(`  Commercial Vehicle Type: ${sampleAd.commercialVehicleDetails?.[0]?.commercialVehicleType}`);
      console.log(`  Body Type: ${sampleAd.commercialVehicleDetails?.[0]?.bodyType}`);
      console.log(`  Manufacturer ID: ${sampleAd.commercialVehicleDetails?.[0]?.manufacturerId}`);
    }
    console.log('');

    // Test 2: Filter by specific commercial vehicle type and body type
    console.log('2️⃣ Testing specific type and body type:');
    const specificFilter = {
      category: "commercial_vehicle",
      commercialVehicleType: "trailer",
      bodyType: "flatbed"
    };
    
    const specificResponse = await axios.post(`${BASE_URL}/ads/filter`, specificFilter);
    console.log(`✅ Specific filter: ${specificResponse.data.total} ads found`);
    
    if (specificResponse.data.total > 0) {
      const sampleAd = specificResponse.data.data[0];
      console.log('Sample ad details:');
      console.log(`  Manufacturer ID: ${sampleAd.commercialVehicleDetails?.[0]?.manufacturerId}`);
      console.log(`  Transmission Type ID: ${sampleAd.commercialVehicleDetails?.[0]?.transmissionTypeId}`);
      console.log(`  Fuel Type ID: ${sampleAd.commercialVehicleDetails?.[0]?.fuelTypeId}`);
    }
    console.log('');

    // Test 3: Test with single manufacturer ID
    console.log('3️⃣ Testing single manufacturer ID:');
    const singleManufacturerFilter = {
      category: "commercial_vehicle",
      commercialVehicleType: "trailer",
      bodyType: "flatbed",
      manufacturerId: "507f1f77bcf86cd799439037"
    };
    
    const singleResponse = await axios.post(`${BASE_URL}/ads/filter`, singleManufacturerFilter);
    console.log(`✅ Single manufacturer: ${singleResponse.data.total} ads found`);
    console.log('');

    // Test 4: Test with multiple manufacturer IDs (the failing case)
    console.log('4️⃣ Testing multiple manufacturer IDs (your case):');
    const multipleManufacturerFilter = {
      category: "commercial_vehicle",
      commercialVehicleType: "trailer",
      bodyType: "flatbed",
      manufacturerIds: [
        "507f1f77bcf86cd799439037",
        "507f1f77bcf86cd799439039"
      ]
    };
    
    console.log('Request:', JSON.stringify(multipleManufacturerFilter, null, 2));
    const multipleResponse = await axios.post(`${BASE_URL}/ads/filter`, multipleManufacturerFilter);
    console.log(`✅ Multiple manufacturers: ${multipleResponse.data.total} ads found`);
    console.log('');

    // Test 5: Check if there are any ads with these specific manufacturer IDs
    console.log('5️⃣ Checking for ads with specific manufacturer IDs:');
    const checkManufacturerFilter = {
      category: "commercial_vehicle",
      manufacturerId: "507f1f77bcf86cd799439037"
    };
    
    const checkResponse = await axios.post(`${BASE_URL}/ads/filter`, checkManufacturerFilter);
    console.log(`✅ Ads with manufacturer 507f1f77bcf86cd799439037: ${checkResponse.data.total} found`);
    
    if (checkResponse.data.total > 0) {
      checkResponse.data.data.forEach((ad, index) => {
        const details = ad.commercialVehicleDetails?.[0];
        console.log(`  Ad ${index + 1}: ${details?.commercialVehicleType} - ${details?.bodyType} - ${details?.manufacturerId}`);
      });
    }
    console.log('');

    // Test 6: Check the other manufacturer ID
    const checkManufacturer2Filter = {
      category: "commercial_vehicle",
      manufacturerId: "507f1f77bcf86cd799439039"
    };
    
    const checkResponse2 = await axios.post(`${BASE_URL}/ads/filter`, checkManufacturer2Filter);
    console.log(`✅ Ads with manufacturer 507f1f77bcf86cd799439039: ${checkResponse2.data.total} found`);
    
    if (checkResponse2.data.total > 0) {
      checkResponse2.data.data.forEach((ad, index) => {
        const details = ad.commercialVehicleDetails?.[0];
        console.log(`  Ad ${index + 1}: ${details?.commercialVehicleType} - ${details?.bodyType} - ${details?.manufacturerId}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

debugManufacturerIds();
