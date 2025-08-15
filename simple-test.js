const axios = require('axios');

async function simpleTest() {
  try {
    console.log('🧪 Simple Test - Checking Server Response...\n');
    
    // Try different ports
    const ports = [5000, 5001, 3000, 3001];
    
    for (const port of ports) {
      console.log(`Testing port ${port}...`);
      try {
        const response = await axios.get(`http://localhost:${port}/ads?limit=1`, {
          timeout: 3000
        });
        console.log(`✅ Server responding on port ${port}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Data length: ${response.data?.data?.length || 0}`);
        console.log(`   Total: ${response.data?.total || 0}`);
        
        if (response.data?.data?.length > 0) {
          console.log(`   First ad ID: ${response.data.data[0].id}`);
        }
        break;
      } catch (error) {
        console.log(`❌ Port ${port}: ${error.code || error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

simpleTest();

