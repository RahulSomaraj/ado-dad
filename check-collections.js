const { MongoClient } = require('mongodb');

async function checkCollections() {
  const uri = 'mongodb://localhost:27017/ado-dad';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('ado-dad');
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📚 Available Collections:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // Check each collection for data
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`\n📊 ${collection.name}: ${count} documents`);
      
      if (count > 0) {
        const sample = await db.collection(collection.name).findOne();
        console.log(`  Sample document keys:`, Object.keys(sample));
        
        // If it's a commercial vehicle related collection, show more details
        if (collection.name.includes('commercial') || collection.name.includes('vehicle')) {
          const sampleDocs = await db.collection(collection.name).find({}).limit(3).toArray();
          console.log(`  Sample documents:`, JSON.stringify(sampleDocs, null, 2));
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkCollections();

