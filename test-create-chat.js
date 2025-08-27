const { io } = require('socket.io-client');

console.log('Testing createAdChat with only adId...\n');

// Test connection to the chat namespace
console.log('1. Connecting to chat namespace...');
const chatSocket = io('http://localhost:5000/chat', {
  auth: {
    userId: '507f1f77bcf86cd799439011',
  },
  query: {
    userId: '507f1f77bcf86cd799439011',
  },
});

chatSocket.on('connect', () => {
  console.log('✅ Chat namespace connected successfully!');
  console.log(`Socket ID: ${chatSocket.id}`);

  // Test createAdChat with only adId
  console.log('\n2. Testing createAdChat with only adId...');
  const testData = {
    adId: '507f1f77bcf86cd799439021',
  };

  console.log(`Sending data: ${JSON.stringify(testData)}`);
  chatSocket.emit('createAdChat', testData, (response) => {
    if (response && response.success) {
      console.log('✅ Chat created successfully!');
      console.log(`Chat ID: ${response.chat._id}`);
      console.log(`Response: ${JSON.stringify(response)}`);
    } else {
      console.log('❌ Error creating chat');
      console.log(`Error: ${response ? response.error : 'No response'}`);
    }

    // Clean up
    chatSocket.disconnect();
    process.exit(0);
  });
});

chatSocket.on('connect_error', (error) => {
  console.log('❌ Chat namespace connection failed');
  console.log(`Error: ${error.message}`);
  process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('❌ Connection timeout');
  process.exit(1);
}, 10000);
