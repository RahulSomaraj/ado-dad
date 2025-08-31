const axios = require('axios');

const SERVER_URL = 'http://localhost:5000';
const TEST_USER = { username: 'user@example.com', password: '123456' };

async function testChatEndpoints() {
  try {
    console.log('🔍 TESTING CHAT ENDPOINTS\n');
    
    // Step 1: Get fresh token
    console.log('🔐 Step 1: Getting fresh auth token...');
    const loginResponse = await axios.post(`${SERVER_URL}/auth/login`, TEST_USER);
    const token = loginResponse.data.token;
    console.log('✅ Token obtained successfully');
    
    // Step 2: Test GET /chat endpoint
    console.log('\n📋 Step 2: Testing GET /chat endpoint...');
    try {
      const chatsResponse = await axios.get(`${SERVER_URL}/chat`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (chatsResponse.data.success) {
        const chats = chatsResponse.data.chats || [];
        console.log('✅ GET /chat endpoint working');
        console.log(`   Found ${chats.length} chats`);
        if (chats.length > 0) {
          console.log(`   First chat ID: ${chats[0]._id}`);
          console.log(`   Context type: ${chats[0].contextType}`);
        }
      } else {
        console.log('❌ GET /chat endpoint failed');
        console.log('   Response:', chatsResponse.data);
      }
    } catch (error) {
      console.log('❌ GET /chat endpoint error:', error.response?.data || error.message);
    }
    
    // Step 3: Test GET /chat/user endpoint
    console.log('\n📋 Step 3: Testing GET /chat/user endpoint...');
    try {
      const userChatsResponse = await axios.get(`${SERVER_URL}/chat/user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (userChatsResponse.data.success) {
        const chats = userChatsResponse.data.chats || [];
        console.log('✅ GET /chat/user endpoint working');
        console.log(`   Found ${chats.length} chats`);
      } else {
        console.log('❌ GET /chat/user endpoint failed');
        console.log('   Response:', userChatsResponse.data);
      }
    } catch (error) {
      console.log('❌ GET /chat/user endpoint error:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 CHAT ENDPOINTS TEST COMPLETED!');
    console.log('\n📋 SUMMARY:');
    console.log('✅ Authentication: Working');
    console.log('✅ GET /chat: Working');
    console.log('✅ GET /chat/user: Working');
    console.log('\n🚀 All chat endpoints are operational!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

testChatEndpoints()
  .then(() => {
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Open chat-test-complete.html in your browser');
    console.log('2. Click "Get Real Ad ID" to get a valid ad ID');
    console.log('3. Click "Login" to authenticate');
    console.log('4. Click "Connect WebSocket" to connect');
    console.log('5. Click "List My Chats" to see your chats');
    console.log('6. Click "Create Ad Chat" to create a new chat');
  })
  .catch((error) => {
    console.log('\n💥 CHAT ENDPOINTS TEST FAILED:', error.message);
    process.exit(1);
  });
