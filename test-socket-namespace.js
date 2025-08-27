const { io } = require('socket.io-client');

console.log('Testing Socket.IO namespace connection...\n');

// Test connection to the main server first
console.log('1. Testing main server connection...');
const mainSocket = io('http://localhost:5000');

mainSocket.on('connect', () => {
  console.log('✅ Main server connected successfully');
  
  // Now test the chat namespace
  console.log('\n2. Testing chat namespace connection...');
  const chatSocket = io('http://localhost:5000/chat', {
    auth: {
      userId: '507f1f77bcf86cd799439011'
    },
    query: {
      userId: '507f1f77bcf86cd799439011'
    }
  });

  chatSocket.on('connect', () => {
    console.log('✅ Chat namespace connected successfully!');
    console.log(`Socket ID: ${chatSocket.id}`);
    
    // Test a simple emit
    console.log('\n3. Testing emit to chat namespace...');
    chatSocket.emit('getUserChats', {}, (response) => {
      if (response && response.success) {
        console.log('✅ getUserChats response received');
        console.log(`Response: ${JSON.stringify(response)}`);
      } else {
        console.log('❌ Error or no response from getUserChats');
        console.log(`Response: ${JSON.stringify(response)}`);
      }
      
      // Clean up
      chatSocket.disconnect();
      mainSocket.disconnect();
      process.exit(0);
    });
  });

  chatSocket.on('connect_error', (error) => {
    console.log('❌ Chat namespace connection failed');
    console.log(`Error: ${error.message}`);
    console.log(`Error details: ${JSON.stringify(error)}`);
    
    mainSocket.disconnect();
    process.exit(1);
  });
});

mainSocket.on('connect_error', (error) => {
  console.log('❌ Main server connection failed');
  console.log(`Error: ${error.message}`);
  process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('❌ Connection timeout');
  process.exit(1);
}, 10000);
