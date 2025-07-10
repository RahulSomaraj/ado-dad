const { MongoClient } = require('mongodb');

async function cleanVehicleInventory() {
  const uri = 'mongodb://localhost:27017/ado-dad';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('ado-dad');

    // Collections to clean
    const collections = [
      'manufacturers',
      'vehiclemodels',
      'vehiclevariants',
      'fueltypes',
      'transmissiontypes',
    ];

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const result = await collection.deleteMany({});
        console.log(
          `Cleaned ${collectionName}: ${result.deletedCount} documents deleted`,
        );
      } catch (error) {
        console.error(`Error cleaning ${collectionName}:`, error.message);
      }
    }

    console.log('Vehicle inventory data cleanup completed');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

cleanVehicleInventory();
