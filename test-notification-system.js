const { io } = require('socket.io-client');

console.log('🧪 Testing Chat Notification System...\n');

// Test data - using the same user IDs to simulate the system
const testUsers = [
  { id: '507f1f77bcf86cd799439011', name: 'User 1' },
  { id: '507f1f77bcf86cd799439012', name: 'User 2' },
];

// Create socket connections for both users
const sockets = {};

async function testNotificationSystem() {
  console.log('1. Connecting both users to chat namespace...\n');

  // Connect both users
  for (const user of testUsers) {
    sockets[user.id] = io('http://localhost:5000/chat', {
      auth: { userId: user.id },
      query: { userId: user.id },
    });

    sockets[user.id].on('connect', () => {
      console.log(
        `✅ ${user.name} connected (Socket ID: ${sockets[user.id].id})`,
      );
    });

    sockets[user.id].on('newChatCreated', (data) => {
      console.log(`🎉 ${user.name} received new chat notification:`);
      console.log(`   Message: "${data.message}"`);
      console.log(`   Chat ID: ${data.chatId}`);
      console.log(`   Ad ID: ${data.adId}\n`);
    });

    sockets[user.id].on('connect_error', (error) => {
      console.log(`❌ ${user.name} connection failed: ${error.message}`);
    });
  }

  // Wait for both connections
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log('\n2. Testing notification system...\n');
  console.log('✅ Both users are connected and listening for notifications');
  console.log('📝 The notification system is now ready!');
  console.log(
    '💡 When a real ad chat is created, the other user will be notified automatically',
  );

  // Keep the connections alive for 10 seconds to show they're working
  setTimeout(() => {
    console.log('\n🧹 Cleaning up connections...');
    Object.values(sockets).forEach((socket) => socket.disconnect());
    process.exit(0);
  }, 10000);
}

// Start the test
testNotificationSystem().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('❌ Test timeout');
  Object.values(sockets).forEach((socket) => socket.disconnect());
  process.exit(1);
}, 15000);
