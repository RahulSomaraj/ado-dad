# Ads Seed Data

This directory contains comprehensive seed data for testing the Ads API system. The seed data includes advertisements for all supported categories with realistic data and proper relationships.

## 📊 Seed Data Overview

The seed script creates **16 advertisements** across all categories:

### 🏠 Property Ads (5 ads)

- **2BHK Apartment** - Mumbai, ₹85L
- **3BHK Villa** - Bangalore, ₹2.5Cr
- **Commercial Space** - Delhi, ₹1.5Cr
- **Independent House** - Bangalore, ₹1.8Cr
- **Residential Plot** - Bangalore, ₹45L

### 🚗 Vehicle Ads (4 ads)

- **Honda City 2020** - Delhi, ₹8.5L
- **Toyota Innova 2019** - Mumbai, ₹12L
- **Maruti Swift 2021** - Bangalore, ₹6.5L
- **Hyundai i20 2022** - Pune, ₹9.5L

### 🚛 Commercial Vehicle Ads (3 ads)

- **Tata 407 Truck** - Pune, ₹18L
- **Mahindra Bolero Pickup** - Chennai, ₹4.5L
- **Eicher Pro 1049** - Ahmedabad, ₹35L

### 🛵 Two-Wheeler Ads (4 ads)

- **Honda Activa 6G** - Bangalore, ₹65K
- **Bajaj Pulsar 150** - Delhi, ₹85K
- **TVS Apache RTR 160** - Mumbai, ₹95K
- **Hero Splendor Plus** - Pune, ₹45K

## 🚀 How to Run

### Prerequisites

1. Ensure MongoDB is running
2. Ensure the application is properly configured
3. Vehicle inventory data should be seeded first (if testing vehicle inventory relationships)

### Run the Seed Script

```bash
# Run ads seed data
npm run seed:ads

# Or run both vehicle inventory and ads seed data
npm run seed
npm run seed:ads
```

### Expected Output

```
🚀 Starting Ads data seeding process...
🌱 Starting Ads data seeding...
🧹 Clearing existing ads data...
✅ Existing data cleared
🏠 Seeding property ads...
✅ Seeded 5 property ads
🚗 Seeding vehicle ads...
✅ Seeded 4 vehicle ads
🚛 Seeding commercial vehicle ads...
✅ Seeded 3 commercial vehicle ads
🛵 Seeding two-wheeler ads...
✅ Seeded 4 two-wheeler ads
✅ Ads data seeding completed successfully!
🎉 Ads data seeding completed successfully!
📊 Summary:
   - 5 Property ads
   - 4 Vehicle ads
   - 3 Commercial Vehicle ads
   - 4 Two-wheeler ads
   - Total: 16 advertisements
```

## 📋 Data Structure

### Sample User IDs

The seed data uses these sample user IDs (should match actual users in your system):

- `507f1f77bcf86cd799439021`
- `507f1f77bcf86cd799439022`
- `507f1f77bcf86cd799439023`
- `507f1f77bcf86cd799439024`
- `507f1f77bcf86cd799439025`

### Vehicle Inventory References

The seed data references these vehicle inventory IDs (should match actual inventory):

- **Manufacturers**: Honda, Toyota, Maruti Suzuki, Tata Motors, Hyundai, Bajaj, TVS
- **Models**: City, Innova, Swift, 407, i20, Pulsar, Apache
- **Variants**: ZX CVT, GX MT, VXI, 407 Turbo, Asta, 150, RTR 160
- **Transmission Types**: Manual, Automatic, CVT, AMT
- **Fuel Types**: Petrol, Diesel, CNG, Electric

## 🧪 Testing APIs

After seeding, you can test all the Ads APIs:

### 1. Get All Ads with Filtering

```bash
GET /ads?category=property&minPrice=5000000&maxPrice=10000000
GET /ads?category=vehicle&manufacturerId=507f1f77bcf86cd799439031
GET /ads?search=honda&location=mumbai
```

### 2. Get Detailed Ad by ID

```bash
GET /ads/{ad_id}
# Returns comprehensive details including vehicle inventory information
```

### 3. Create New Ads

```bash
POST /ads
# Use the examples from the Swagger documentation
```

### 4. Filter Examples

The seed data supports all filter scenarios:

- **Property filters**: bedrooms, bathrooms, area, amenities
- **Vehicle filters**: manufacturer, model, year, mileage, fuel type
- **Commercial vehicle filters**: payload capacity, body type, permits
- **Combined filters**: price range, location, search terms
- **Pagination and sorting**: page, limit, sortBy, sortOrder

## 🔧 Customization

### Adding More Seed Data

To add more advertisements:

1. **For Properties**: Add new ad objects in `seedPropertyAds()` method
2. **For Vehicles**: Add new ad objects in `seedVehicleAds()` method
3. **For Commercial Vehicles**: Add new ad objects in `seedCommercialVehicleAds()` method
4. **For Two-Wheelers**: Add new ad objects in `seedTwoWheelerAds()` method

### Modifying Existing Data

Edit the individual ad objects in the respective seeding methods to modify:

- Prices, locations, descriptions
- Vehicle specifications
- Property details
- Images and features

### Vehicle Inventory Relationships

If you have actual vehicle inventory data:

1. Replace the sample IDs with real manufacturer, model, variant IDs
2. Update the comments to reflect actual vehicle names
3. Ensure the referenced inventory items exist in your database

## 🗂️ Files Structure

```
src/ads/seed/
├── README.md              # This documentation
├── seed-ads-data.ts       # Main seed service with all data
├── run-seed.ts           # Script runner for execution
└── examples/             # Example response data
    ├── create-ad-examples.json
    ├── filter-examples.json
    └── detailed-response-examples.json
```

## ⚠️ Important Notes

1. **Database Cleanup**: The seed script clears existing ads data before seeding
2. **Dependencies**: Vehicle inventory data should be seeded first for proper relationships
3. **User IDs**: Ensure the sample user IDs exist in your users collection
4. **Environment**: Make sure your MongoDB connection is properly configured
5. **Testing**: Use this data to thoroughly test all API endpoints and filtering scenarios

## 🎯 Use Cases

This seed data is perfect for:

- **API Testing**: Test all CRUD operations and filtering
- **Frontend Development**: Provide realistic data for UI development
- **Performance Testing**: Test with realistic data volumes
- **Demo Purposes**: Showcase the system capabilities
- **Development**: Provide consistent test data across environments
