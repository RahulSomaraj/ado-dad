const { MongoClient } = require('mongodb');

async function getActualIds() {
  // Use the same cloud MongoDB connection as the seed script
  const uri = 'mongodb+srv://ado-dad:ado-dad@cluster0.xhgz.mongodb.net/ado-dad?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Cloud');
    
    const db = client.db('ado-dad');
    
    // Get sample IDs from commercial vehicle ads
    const sampleAds = await db.collection('commercialvehicleads')
      .find({})
      .limit(5)
      .project({ 
        manufacturerId: 1, 
        transmissionTypeId: 1,
        fuelTypeId: 1,
        commercialVehicleType: 1,
        bodyType: 1
      })
      .toArray();
    
    if (sampleAds.length > 0) {
      console.log('\n📊 Sample Commercial Vehicle Ads:');
      sampleAds.forEach((ad, index) => {
        console.log(`\nAd ${index + 1}:`);
        console.log(`  Commercial Vehicle Type: ${ad.commercialVehicleType}`);
        console.log(`  Body Type: ${ad.bodyType}`);
        console.log(`  Manufacturer ID: ${ad.manufacturerId}`);
        console.log(`  Transmission Type ID: ${ad.transmissionTypeId}`);
        console.log(`  Fuel Type ID: ${ad.fuelTypeId}`);
      });
      
      // Get unique IDs
      const manufacturerIds = [...new Set(sampleAds.map(ad => ad.manufacturerId))];
      const transmissionTypeIds = [...new Set(sampleAds.map(ad => ad.transmissionTypeId))];
      const fuelTypeIds = [...new Set(sampleAds.map(ad => ad.fuelTypeId))];
      const vehicleTypes = [...new Set(sampleAds.map(ad => ad.commercialVehicleType))];
      const bodyTypes = [...new Set(sampleAds.map(ad => ad.bodyType))];
      
      console.log('\n🔍 Available IDs for Testing:');
      console.log('Manufacturer IDs:', manufacturerIds);
      console.log('Transmission Type IDs:', transmissionTypeIds);
      console.log('Fuel Type IDs:', fuelTypeIds);
      console.log('Vehicle Types:', vehicleTypes);
      console.log('Body Types:', bodyTypes);
      
      // Provide working examples
      if (manufacturerIds.length >= 2 && transmissionTypeIds.length >= 2 && fuelTypeIds.length >= 2) {
        console.log('\n✅ Working JSON Examples:');
        
        console.log('\n1. Multiple Fuel Types:');
        console.log(JSON.stringify({
          category: "commercial_vehicle",
          commercialVehicleType: vehicleTypes[0],
          bodyType: bodyTypes[0],
          fuelTypeIds: [fuelTypeIds[0], fuelTypeIds[1]]
        }, null, 2));
        
        console.log('\n2. Multiple Transmission Types:');
        console.log(JSON.stringify({
          category: "commercial_vehicle",
          commercialVehicleType: vehicleTypes[0],
          bodyType: bodyTypes[0],
          transmissionTypeIds: [transmissionTypeIds[0], transmissionTypeIds[1]]
        }, null, 2));
        
        console.log('\n3. Both Multiple:');
        console.log(JSON.stringify({
          category: "commercial_vehicle",
          commercialVehicleType: vehicleTypes[0],
          bodyType: bodyTypes[0],
          fuelTypeIds: [fuelTypeIds[0], fuelTypeIds[1]],
          transmissionTypeIds: [transmissionTypeIds[0], transmissionTypeIds[1]]
        }, null, 2));
      }
    } else {
      console.log('❌ No commercial vehicle ads found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

getActualIds();
