const { MongoClient } = require('mongodb');

async function setupTestDatabase() {
  const testDbUri = 'mongodb://localhost:27017/adodad_test';
  const client = new MongoClient(testDbUri);

  try {
    await client.connect();
    const db = client.db();

    console.log('🧹 Setting up test database...');

    // Clear all collections in test database
    const collections = await db.listCollections().toArray();

    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
      console.log(`   Cleared collection: ${collection.name}`);
    }

    // Create indexes for test database
    await db.collection('users').createIndex({ phone: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('ads').createIndex({ title: 1 });
    await db.collection('ads').createIndex({ category: 1 });
    await db.collection('ads').createIndex({ seller: 1 });

    console.log('✅ Test database setup complete');
    console.log(`   Database: ${testDbUri}`);
  } catch (error) {
    console.error('❌ Error setting up test database:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  setupTestDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { setupTestDatabase };
