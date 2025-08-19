const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function getWorkingIds() {
  console.log('🔍 Getting Working IDs from Database\n');

  try {
    // Get all commercial vehicle ads
    const response = await axios.post(`${BASE_URL}/ads/filter`, {
      category: "commercial_vehicle"
    });
    
    console.log(`📊 Found ${response.data.total} commercial vehicle ads`);
    
    if (response.data.total > 0) {
      console.log('\n📋 Sample Ads with Real IDs:');
      
      response.data.data.forEach((ad, index) => {
        const details = ad.commercialVehicleDetails?.[0];
        if (details) {
          console.log(`\nAd ${index + 1}:`);
          console.log(`  Title: ${ad.title}`);
          console.log(`  Commercial Vehicle Type: ${details.commercialVehicleType}`);
          console.log(`  Body Type: ${details.bodyType}`);
          console.log(`  Manufacturer ID: ${details.manufacturerId}`);
          console.log(`  Model ID: ${details.modelId}`);
          console.log(`  Variant ID: ${details.variantId}`);
          console.log(`  Transmission Type ID: ${details.transmissionTypeId}`);
          console.log(`  Fuel Type ID: ${details.fuelTypeId}`);
          console.log(`  Color: ${details.color}`);
        }
      });
      
      // Get unique values
      const uniqueTypes = [...new Set(response.data.data.map(ad => ad.commercialVehicleDetails?.[0]?.commercialVehicleType).filter(Boolean))];
      const uniqueBodyTypes = [...new Set(response.data.data.map(ad => ad.commercialVehicleDetails?.[0]?.bodyType).filter(Boolean))];
      const uniqueManufacturers = [...new Set(response.data.data.map(ad => ad.commercialVehicleDetails?.[0]?.manufacturerId).filter(Boolean))];
      const uniqueTransmissions = [...new Set(response.data.data.map(ad => ad.commercialVehicleDetails?.[0]?.transmissionTypeId).filter(Boolean))];
      const uniqueFuelTypes = [...new Set(response.data.data.map(ad => ad.commercialVehicleDetails?.[0]?.fuelTypeId).filter(Boolean))];
      
      console.log('\n🔍 Available Values:');
      console.log('Commercial Vehicle Types:', uniqueTypes);
      console.log('Body Types:', uniqueBodyTypes);
      console.log('Manufacturer IDs:', uniqueManufacturers);
      console.log('Transmission Type IDs:', uniqueTransmissions);
      console.log('Fuel Type IDs:', uniqueFuelTypes);
      
      // Provide working examples
      if (uniqueTypes.length > 0 && uniqueBodyTypes.length > 0 && uniqueManufacturers.length > 0) {
        console.log('\n✅ Working JSON Examples:');
        
        console.log('\n1. Basic Filter:');
        console.log(JSON.stringify({
          category: "commercial_vehicle"
        }, null, 2));
        
        console.log('\n2. Single Manufacturer ID:');
        console.log(JSON.stringify({
          category: "commercial_vehicle",
          commercialVehicleType: uniqueTypes[0],
          bodyType: uniqueBodyTypes[0],
          manufacturerId: uniqueManufacturers[0]
        }, null, 2));
        
        console.log('\n3. Single Fuel Type:');
        console.log(JSON.stringify({
          category: "commercial_vehicle",
          commercialVehicleType: uniqueTypes[0],
          bodyType: uniqueBodyTypes[0],
          fuelTypeId: uniqueFuelTypes[0]
        }, null, 2));
        
        console.log('\n4. Single Transmission Type:');
        console.log(JSON.stringify({
          category: "commercial_vehicle",
          commercialVehicleType: uniqueTypes[0],
          bodyType: uniqueBodyTypes[0],
          transmissionTypeId: uniqueTransmissions[0]
        }, null, 2));
        
        console.log('\n5. Combined Filters:');
        console.log(JSON.stringify({
          category: "commercial_vehicle",
          commercialVehicleType: uniqueTypes[0],
          bodyType: uniqueBodyTypes[0],
          manufacturerId: uniqueManufacturers[0],
          fuelTypeId: uniqueFuelTypes[0],
          transmissionTypeId: uniqueTransmissions[0]
        }, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

getWorkingIds();

