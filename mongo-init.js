// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Create the application database
db = db.getSiblingDB('adodad_db');

// Create application user with read/write permissions
db.createUser({
  user: 'adodad_user',
  pwd: 'adodad_password',
  roles: [
    {
      role: 'readWrite',
      db: 'adodad_db',
    },
  ],
});

// Create collections with proper indexes
db.createCollection('ads');
db.createCollection('propertyads');
db.createCollection('vehicleads');
db.createCollection('commercialvehicleads');
db.createCollection('manufacturers');
db.createCollection('vehiclemodels');
db.createCollection('vehiclevariants');
db.createCollection('fueltypes');
db.createCollection('transmissiontypes');
db.createCollection('propertytypes');
db.createCollection('users');
db.createCollection('favorites');
db.createCollection('banners');
db.createCollection('categories');
db.createCollection('products');
db.createCollection('carts');
db.createCollection('ratings');
db.createCollection('showrooms');
db.createCollection('chats');
db.createCollection('refreshtokens');

// Create text indexes for search functionality
db.ads.createIndex({ '$**': 'text' });
db.manufacturers.createIndex({ '$**': 'text' });
db.vehiclemodels.createIndex({ '$**': 'text' });

// Create compound indexes for better query performance
db.ads.createIndex({ category: 1, isActive: 1, postedAt: -1 });
db.ads.createIndex({ location: 1, category: 1 });
db.ads.createIndex({ price: 1, category: 1 });
db.manufacturers.createIndex({ name: 1, isActive: 1 });
db.vehiclemodels.createIndex({ manufacturer: 1, vehicleType: 1 });
db.vehiclevariants.createIndex({ vehicleModel: 1, fuelType: 1 });

print('MongoDB initialization completed successfully!');
