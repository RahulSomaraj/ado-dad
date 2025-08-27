const crypto = require('crypto');

// Helper functions for chat testing
class ChatTestHelper {
  constructor() {
    this.testData = {
      users: [
        {
          id: '507f1f77bcf86cd799439011',
          name: 'John Doe',
          email: 'john@example.com',
        },
        {
          id: '507f1f77bcf86cd799439012',
          name: 'Jane Smith',
          email: 'jane@example.com',
        },
        {
          id: '507f1f77bcf86cd799439013',
          name: 'Bob Johnson',
          email: 'bob@example.com',
        },
      ],
      ads: [
        {
          id: '507f1f77bcf86cd799439021',
          title: 'Toyota Camry 2020',
          posterId: '507f1f77bcf86cd799439011',
        },
        {
          id: '507f1f77bcf86cd799439022',
          title: 'Honda Civic 2019',
          posterId: '507f1f77bcf86cd799439012',
        },
        {
          id: '507f1f77bcf86cd799439023',
          title: 'Ford Mustang 2021',
          posterId: '507f1f77bcf86cd799439013',
        },
      ],
    };
  }

  // Generate a mock JWT token for testing
  generateMockJWT(userId) {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const payload = {
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      iss: 'ado-dad-api',
      aud: 'ado-dad-users',
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
      'base64url',
    );
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );

    // Note: This is a mock token for testing only - not cryptographically secure
    const signature = crypto
      .createHmac('sha256', 'test-secret')
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  // Get test user data
  getTestUser(index = 0) {
    return this.testData.users[index] || this.testData.users[0];
  }

  // Get test ad data
  getTestAd(index = 0) {
    return this.testData.ads[index] || this.testData.ads[0];
  }

  // Generate test URL for the chat frontend
  generateTestURL(userId, serverUrl = 'http://localhost:3000') {
    const token = this.generateMockJWT(userId);
    return `${serverUrl}/chat-test-frontend.html?userId=${userId}&token=${token}&server=${serverUrl}`;
  }

  // Print test scenarios
  printTestScenarios() {
    console.log('\n=== Chat Test Scenarios ===\n');

    this.testData.users.forEach((user, index) => {
      const ad = this.testData.ads[index];
      console.log(
        `Scenario ${index + 1}: ${user.name} chats about ${ad.title}`,
      );
      console.log(`User ID: ${user.id}`);
      console.log(`Ad ID: ${ad.id}`);
      console.log(`Ad Poster ID: ${ad.posterId}`);
      console.log(`Test URL: ${this.generateTestURL(user.id)}`);
      console.log('---');
    });

    console.log('\n=== Testing Steps ===');
    console.log('1. Open the test URL in your browser');
    console.log('2. The frontend will auto-fill the user ID and token');
    console.log('3. Click "Connect" to establish WebSocket connection');
    console.log('4. Enter Ad ID and Ad Poster ID');
    console.log('5. Click "Create Ad Chat" to start a new chat');
    console.log('6. Switch to "Chats" tab to see your chats');
    console.log('7. Click on a chat to start messaging');
    console.log('8. Test real-time messaging between different users');
  }

  // Generate cURL commands for testing REST endpoints
  generateCurlCommands(userId, adId, serverUrl = 'http://localhost:5000') {
    const token = this.generateMockJWT(userId);

    console.log('\n=== cURL Commands for Testing ===\n');

    console.log('1. Create Ad Chat:');
    console.log(`curl -X POST ${serverUrl}/chat/ad/${adId} \\`);
    console.log(`  -H "Authorization: Bearer ${token}" \\`);
    console.log(`  -H "Content-Type: application/json"`);

    console.log('\n2. Get User Chats:');
    console.log(`curl -X GET ${serverUrl}/chat/user \\`);
    console.log(`  -H "Authorization: Bearer ${token}"`);

    console.log('\n3. Get Chat Messages (replace CHAT_ID):');
    console.log(`curl -X GET ${serverUrl}/chat/CHAT_ID/messages \\`);
    console.log(`  -H "Authorization: Bearer ${token}"`);

    console.log('\n4. Send Message (replace CHAT_ID):');
    console.log(`curl -X POST ${serverUrl}/chat/CHAT_ID/messages \\`);
    console.log(`  -H "Authorization: Bearer ${token}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"content": "Hello, this is a test message!"}'`);
  }

  // Generate test data for database seeding
  generateTestData() {
    return {
      users: this.testData.users,
      ads: this.testData.ads,
      sampleChats: [
        {
          participants: [this.testData.users[0].id, this.testData.users[1].id],
          contextType: 'vehicle',
          contextId: this.testData.ads[0].id,
          postId: this.testData.ads[0].id,
        },
        {
          participants: [this.testData.users[1].id, this.testData.users[2].id],
          contextType: 'vehicle',
          contextId: this.testData.ads[1].id,
          postId: this.testData.ads[1].id,
        },
      ],
    };
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatTestHelper;
}

// If running directly, show test scenarios
if (require.main === module) {
  const helper = new ChatTestHelper();
  helper.printTestScenarios();

  // Generate cURL commands for first test scenario
  const user = helper.getTestUser(0);
  const ad = helper.getTestAd(0);
  helper.generateCurlCommands(user.id, ad.id);

  console.log('\n=== Quick Test URLs ===');
  helper.testData.users.forEach((user, index) => {
    console.log(
      `User ${index + 1} (${user.name}): ${helper.generateTestURL(user.id)}`,
    );
  });
}
