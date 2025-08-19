const { MongoClient } = require('mongodb');
require('dotenv/config');

async function getExistingIds() {
  // Use the same connection logic as the application
  let uri = process.env.MONGO_URI;
  
  if (!uri) {
    const user = encodeURIComponent(process.env.MONGO_USER || '');
    const password = encodeURIComponent(process.env.MONGO_PASSWORD || '');
    const host = process.env.MONGO_HOST || 'localhost';
    const port = process.env.MONGO_PORT || '27017';
    const dbName = process.env.MONGO_DATABASE || 'ado-dad';

    if (user && password) {
      uri = `mongodb://${user}:${password}@${host}:${port}/${dbName}?authSource=admin`;
    } else {
      uri = `mongodb://${host}:${port}/${dbName}`;
    }
  }
  
  console.log('🔗 Connecting to MongoDB...');
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Get all commercial vehicle ads with their manufacturer IDs
    const commercialVehicleAds = await db.collection('commercialvehicleads')
      .find({})
      .project({ 
        manufacturerId: 1, 
        modelId: 1, 
        variantId: 1,
        transmissionTypeId: 1,
        fuelTypeId: 1,
        commercialVehicleType: 1,
        bodyType: 1
      })
      .toArray();
    
    console.log('\n📊 Found', commercialVehicleAds.length, 'commercial vehicle ads');
    
    if (commercialVehicleAds.length > 0) {
      console.log('\n🔍 Sample commercial vehicle ad details:');
      console.log(JSON.stringify(commercialVehicleAds[0], null, 2));
      
      // Extract unique IDs
      const manufacturerIds = [...new Set(commercialVehicleAds.map(ad => ad.manufacturerId))];
      const modelIds = [...new Set(commercialVehicleAds.map(ad => ad.modelId))];
      const variantIds = [...new Set(commercialVehicleAds.map(ad => ad.variantId).filter(id => id))];
      const transmissionTypeIds = [...new Set(commercialVehicleAds.map(ad => ad.transmissionTypeId))];
      const fuelTypeIds = [...new Set(commercialVehicleAds.map(ad => ad.fuelTypeId))];
      
      console.log('\n🏭 Manufacturer IDs:', manufacturerIds);
      console.log('🚗 Model IDs:', modelIds);
      console.log('🔧 Variant IDs:', variantIds);
      console.log('⚙️ Transmission Type IDs:', transmissionTypeIds);
      console.log('⛽ Fuel Type IDs:', fuelTypeIds);
      
      // Show vehicle types and body types
      const vehicleTypes = [...new Set(commercialVehicleAds.map(ad => ad.commercialVehicleType))];
      const bodyTypes = [...new Set(commercialVehicleAds.map(ad => ad.bodyType))];
      
      console.log('\n🚛 Commercial Vehicle Types:', vehicleTypes);
      console.log('📦 Body Types:', bodyTypes);
      
      // Provide working JSON examples
      if (manufacturerIds.length >= 2) {
        console.log('\n✅ Working JSON Examples:');
        console.log('\n1. Single Manufacturer ID:');
        console.log(JSON.stringify({
          category: "commercial_vehicle",
          commercialVehicleType: vehicleTypes[0],
          bodyType: bodyTypes[0],
          manufacturerId: manufacturerIds[0]
        }, null, 2));
        
        console.log('\n2. Multiple Manufacturer IDs:');
        console.log(JSON.stringify({
          category: "commercial_vehicle",
          commercialVehicleType: vehicleTypes[0],
          bodyType: bodyTypes[0],
          manufacturerIds: [manufacturerIds[0], manufacturerIds[1]]
        }, null, 2));
        
        console.log('\n3. Multiple Fuel Types:');
        console.log(JSON.stringify({
          category: "commercial_vehicle",
          commercialVehicleType: vehicleTypes[0],
          bodyType: bodyTypes[0],
          fuelTypeIds: [fuelTypeIds[0], fuelTypeIds[1]]
        }, null, 2));
        
        console.log('\n4. Multiple Transmission Types:');
        console.log(JSON.stringify({
          category: "commercial_vehicle",
          commercialVehicleType: vehicleTypes[0],
          bodyType: bodyTypes[0],
          transmissionTypeIds: [transmissionTypeIds[0], transmissionTypeIds[1]]
        }, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

getExistingIds();
