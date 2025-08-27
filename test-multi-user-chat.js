const { io } = require('socket.io-client');

console.log('🧪 Testing Multi-User Chat Scenario...\n');

// Test data
const testUsers = [
  { id: '507f1f77bcf86cd799439011', name: 'Ad Creator (John)' },
  { id: '507f1f77bcf86cd799439012', name: 'Chat User (Jane)' },
];

const testAdId = '507f1f77bcf86cd799439021';

// Create socket connections for both users
const sockets = {};

async function testMultiUserChat() {
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

    sockets[user.id].on('newMessage', (message) => {
      console.log(`📨 ${user.name} received message: "${message.content}"`);
      console.log(`   From: ${message.sender}, Chat: ${message.chat}\n`);
    });

    sockets[user.id].on('newChatCreated', (data) => {
      console.log(
        `🎉 ${user.name} received new chat notification: "${data.message}"`,
      );
      console.log(`   Chat ID: ${data.chatId}, Ad ID: ${data.adId}\n`);
    });

    sockets[user.id].on('connect_error', (error) => {
      console.log(`❌ ${user.name} connection failed: ${error.message}`);
    });
  }

  // Wait for both connections
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log('\n2. Creating chat from both users...\n');

  // User 1 (Ad Creator) creates chat
  console.log(`${testUsers[0].name} creating chat for ad ${testAdId}...`);
  sockets[testUsers[0].id].emit(
    'createAdChat',
    { adId: testAdId },
    (response) => {
      if (response.success) {
        console.log(
          `✅ ${testUsers[0].name} created chat: ${response.chat._id}`,
        );

        // User 2 (Chat User) creates same chat
        setTimeout(() => {
          console.log(
            `\n${testUsers[1].name} creating chat for ad ${testAdId}...`,
          );
          sockets[testUsers[1].id].emit(
            'createAdChat',
            { adId: testAdId },
            (response2) => {
              if (response2.success) {
                console.log(
                  `✅ ${testUsers[1].name} created chat: ${response2.chat._id}`,
                );

                // Test messaging
                setTimeout(() => testMessaging(response.chat._id), 1000);
              } else {
                console.log(
                  `❌ ${testUsers[1].name} failed to create chat: ${response2.error}`,
                );
              }
            },
          );
        }, 1000);
      } else {
        console.log(
          `❌ ${testUsers[0].name} failed to create chat: ${response.error}`,
        );
      }
    },
  );
}

function testMessaging(chatId) {
  console.log('\n3. Testing messaging between users...\n');

  // User 2 sends message to User 1
  const message1 = "Hi! I'm interested in your ad. Is it still available?";
  console.log(`${testUsers[1].name} sending: "${message1}"`);

  sockets[testUsers[1].id].emit(
    'sendMessage',
    {
      chatId: chatId,
      content: message1,
    },
    (response) => {
      if (response.success) {
        console.log(`✅ ${testUsers[1].name} sent message successfully`);

        // User 1 responds
        setTimeout(() => {
          const message2 =
            "Yes, it's still available! When would you like to see it?";
          console.log(`\n${testUsers[0].name} sending: "${message2}"`);

          sockets[testUsers[0].id].emit(
            'sendMessage',
            {
              chatId: chatId,
              content: message2,
            },
            (response2) => {
              if (response2.success) {
                console.log(
                  `✅ ${testUsers[0].name} sent message successfully`,
                );

                // User 2 sends another message
                setTimeout(() => {
                  const message3 = 'Great! Can we meet tomorrow at 2 PM?';
                  console.log(`\n${testUsers[1].name} sending: "${message3}"`);

                  sockets[testUsers[1].id].emit(
                    'sendMessage',
                    {
                      chatId: chatId,
                      content: message3,
                    },
                    (response3) => {
                      if (response3.success) {
                        console.log(
                          `✅ ${testUsers[1].name} sent message successfully`,
                        );

                        // Clean up after 3 seconds
                        setTimeout(() => {
                          console.log('\n🧹 Cleaning up connections...');
                          Object.values(sockets).forEach((socket) =>
                            socket.disconnect(),
                          );
                          process.exit(0);
                        }, 3000);
                      } else {
                        console.log(
                          `❌ ${testUsers[1].name} failed to send message: ${response3.error}`,
                        );
                      }
                    },
                  );
                }, 1000);
              } else {
                console.log(
                  `❌ ${testUsers[0].name} failed to send message: ${response2.error}`,
                );
              }
            },
          );
        }, 1000);
      } else {
        console.log(
          `❌ ${testUsers[1].name} failed to send message: ${response.error}`,
        );
      }
    },
  );
}

// Start the test
testMultiUserChat().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('❌ Test timeout');
  Object.values(sockets).forEach((socket) => socket.disconnect());
  process.exit(1);
}, 30000);
