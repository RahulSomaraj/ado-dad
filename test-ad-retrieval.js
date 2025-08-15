const axios = require('axios');

async function testAdRetrieval() {
  try {
    console.log('🧪 Testing Ad Retrieval...\n');
    
    const baseURL = 'http://localhost:5000';
    const adId = '689db5ad4ac1b812b8257ea4'; // The ad ID from your data

    // Test 1: Get specific ad by ID
    console.log('1. Testing GET /ads/{id}...');
    try {
      const response = await axios.get(`${baseURL}/ads/${adId}`);
      console.log('✅ Ad retrieved successfully:');
      console.log('   Title:', response.data.title);
      console.log('   Category:', response.data.category);
      console.log('   Price:', response.data.price);
      console.log('   Vehicle Details:', response.data.vehicleDetails ? 'Present' : 'Missing');
    } catch (error) {
      console.log('❌ Error retrieving specific ad:', error.response?.data || error.message);
    }

    // Test 2: Get all ads
    console.log('\n2. Testing GET /ads...');
    try {
      const response = await axios.get(`${baseURL}/ads?limit=10`);
      console.log(`✅ Found ${response.data.data.length} ads total`);
      
      // Check if our specific ad is in the results
      const ourAd = response.data.data.find(ad => ad.id === adId);
      if (ourAd) {
        console.log('✅ Our ad found in results:');
        console.log('   Title:', ourAd.title);
        console.log('   Category:', ourAd.category);
      } else {
        console.log('❌ Our ad NOT found in results');
        console.log('   Available ad IDs:', response.data.data.map(ad => ad.id).slice(0, 5));
      }
    } catch (error) {
      console.log('❌ Error retrieving all ads:', error.response?.data || error.message);
    }

    // Test 3: Get ads with vehicle category filter
    console.log('\n3. Testing GET /ads with vehicle category...');
    try {
      const response = await axios.get(`${baseURL}/ads?category=private_vehicle&limit=10`);
      console.log(`✅ Found ${response.data.data.length} vehicle ads`);
      
      const ourAd = response.data.data.find(ad => ad.id === adId);
      if (ourAd) {
        console.log('✅ Our vehicle ad found in filtered results');
      } else {
        console.log('❌ Our vehicle ad NOT found in filtered results');
      }
    } catch (error) {
      console.log('❌ Error retrieving vehicle ads:', error.response?.data || error.message);
    }

    console.log('\n✅ Testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAdRetrieval();

