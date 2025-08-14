const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testFilter(filterName, filterParams, description) {
  try {
    console.log(`\n🔍 Testing ${filterName}...`);
    console.log(`📝 Description: ${description}`);
    console.log(`🔧 Parameters:`, JSON.stringify(filterParams, null, 2));
    
    const response = await axios.get(`${BASE_URL}/ads`, {
      params: filterParams,
      timeout: 10000
    });
    
    const { data, total, page, limit } = response.data;
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Results: ${total} ads found`);
    console.log(`📄 Page: ${page}/${Math.ceil(total/limit)}`);
    
    if (data.length > 0) {
      console.log(`📋 Sample ad details:`);
      const sampleAd = data[0];
      console.log(`   ID: ${sampleAd.id}`);
      console.log(`   Category: ${sampleAd.category}`);
      console.log(`   Price: ${sampleAd.price}`);
      console.log(`   Has vehicleDetails: ${sampleAd.vehicleDetails ? 'Yes' : 'No'}`);
      
      if (sampleAd.vehicleDetails && sampleAd.vehicleDetails.length > 0) {
        const vehicle = sampleAd.vehicleDetails[0];
        console.log(`   Vehicle Details:`);
        console.log(`     Manufacturer ID: ${vehicle.manufacturerId}`);
        console.log(`     Model ID: ${vehicle.modelId}`);
        console.log(`     Year: ${vehicle.year}`);
      }
    } else {
      console.log(`❌ No ads found with this filter`);
    }
    
    return { success: true, total, data: data.length };
  } catch (error) {
    console.log(`❌ Error testing ${filterName}:`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, error.response.data);
    } else {
      console.log(`   Message: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
}

async function runAllFilterTests() {
  console.log('🧪 Testing All Filters Individually...\n');
  
  const filters = [
    {
      name: 'No Filter (All Ads)',
      params: {},
      description: 'Get all ads without any filters'
    },
    {
      name: 'Category Filter - Private Vehicle',
      params: { category: 'private_vehicle' },
      description: 'Filter by private vehicle category'
    },
    {
      name: 'Category Filter - Commercial Vehicle',
      params: { category: 'commercial_vehicle' },
      description: 'Filter by commercial vehicle category'
    },
    {
      name: 'Category Filter - Property',
      params: { category: 'property' },
      description: 'Filter by property category'
    },
    {
      name: 'Price Range Filter',
      params: { minPrice: 500000, maxPrice: 1000000 },
      description: 'Filter by price range 500k-1M'
    },
    {
      name: 'Year Filter (minYear)',
      params: { minYear: 2019 },
      description: 'Filter by minimum year 2019'
    },
    {
      name: 'Year Filter (maxYear)',
      params: { maxYear: 2019 },
      description: 'Filter by maximum year 2019'
    },
    {
      name: 'Year Range Filter',
      params: { minYear: 2019, maxYear: 2020 },
      description: 'Filter by year range 2019-2020'
    },
    {
      name: 'Manufacturer Filter',
      params: { manufacturerId: '686fb37cab966c7e18f263f8' },
      description: 'Filter by specific manufacturer ID'
    },
    {
      name: 'Model Filter',
      params: { modelId: '686fb37cab966c7e18f26432' },
      description: 'Filter by specific model ID'
    },
    {
      name: 'Location Filter',
      params: { location: 'Mumbai' },
      description: 'Filter by location containing "Mumbai"'
    },
    {
      name: 'Active Status Filter',
      params: { isActive: 'true' },
      description: 'Filter by active ads only'
    },
    {
      name: 'Posted By Filter',
      params: { postedBy: '688748963a96354097651db9' },
      description: 'Filter by specific user who posted'
    },
    {
      name: 'Combined Filter - Vehicle + Year',
      params: { 
        category: 'private_vehicle',
        minYear: 2019 
      },
      description: 'Filter by private vehicle category AND minimum year 2019'
    },
    {
      name: 'Combined Filter - Manufacturer + Model',
      params: { 
        manufacturerId: '686fb37cab966c7e18f263f8',
        modelId: '686fb37cab966c7e18f26432'
      },
      description: 'Filter by specific manufacturer AND model'
    },
    {
      name: 'Color Filter',
      params: { color: 'White' },
      description: 'Filter by vehicle color White'
    },
    {
      name: 'Mileage Filter',
      params: { maxMileage: 50000 },
      description: 'Filter by maximum mileage 50,000'
    },
    {
      name: 'First Owner Filter',
      params: { isFirstOwner: 'true' },
      description: 'Filter by first owner vehicles'
    },
    {
      name: 'Insurance Filter',
      params: { hasInsurance: 'true' },
      description: 'Filter by vehicles with insurance'
    }
  ];
  
  const results = [];
  
  for (const filter of filters) {
    const result = await testFilter(filter.name, filter.params, filter.description);
    results.push({ ...filter, result });
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n📊 SUMMARY OF ALL FILTER TESTS:');
  console.log('================================');
  
  const workingFilters = results.filter(r => r.result.success && r.result.total > 0);
  const emptyFilters = results.filter(r => r.result.success && r.result.total === 0);
  const failedFilters = results.filter(r => !r.result.success);
  
  console.log(`✅ Working filters (${workingFilters.length}):`);
  workingFilters.forEach(f => {
    console.log(`   - ${f.name}: ${f.result.total} ads`);
  });
  
  console.log(`\n⚠️  Empty results (${emptyFilters.length}):`);
  emptyFilters.forEach(f => {
    console.log(`   - ${f.name}: 0 ads`);
  });
  
  console.log(`\n❌ Failed filters (${failedFilters.length}):`);
  failedFilters.forEach(f => {
    console.log(`   - ${f.name}: ${f.result.error}`);
  });
  
  console.log(`\n🎯 Total filters tested: ${results.length}`);
  console.log(`✅ Working: ${workingFilters.length}`);
  console.log(`⚠️  Empty: ${emptyFilters.length}`);
  console.log(`❌ Failed: ${failedFilters.length}`);
}

// Wait for server to start
setTimeout(async () => {
  try {
    await runAllFilterTests();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}, 3000);
