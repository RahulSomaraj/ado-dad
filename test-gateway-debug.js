const io = require('socket.io-client');

console.log('🔍 Testing Chat Gateway Connection (Guard Disabled)...');

// Connect to the chat namespace without JWT
const socket = io('http://localhost:5000/chat', {
  transports: ['websocket', 'polling'],
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to chat server');
  console.log('🆔 Socket ID:', socket.id);

  // Test ping first
  console.log('🏓 Testing ping...');
  socket.emit('ping', { t0: Date.now() }, (response) => {
    console.log('🏓 Ping response:', response);

    // If ping works, test getUserChatRooms
    if (response?.ok) {
      console.log('📋 Testing getUserChatRooms...');
      socket.emit('getUserChatRooms', {}, (response) => {
        console.log('📋 getUserChatRooms response:', response);
      });
    }
  });
});

socket.on('connected', (data) => {
  console.log('🔌 Connected event received:', data);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection error:', error.message);
  console.log('🔍 Error details:', error);
});

// Timeout for getUserChatRooms
setTimeout(() => {
  console.log('⏰ Timeout reached - checking if getUserChatRooms was called');
  if (socket.connected) {
    console.log('🔄 Testing getUserChatRooms again...');
    socket.emit('getUserChatRooms', {}, (response) => {
      console.log('📋 getUserChatRooms response (retry):', response);
    });
  }
}, 5000);

// Cleanup after 10 seconds
setTimeout(() => {
  console.log('🧹 Cleaning up...');
  socket.disconnect();
  process.exit(0);
}, 10000);
