const { io } = require('socket.io-client');

// Test WebSocket connection
async function testWebSocketConnection() {
  console.log('🔌 Testing WebSocket connection...');
  
  try {
    // Test connection without authentication first
    const socket = io('http://localhost:5000/chat', {
      transports: ['websocket'],
      timeout: 5000,
      autoConnect: false,
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully (no auth)');
      socket.disconnect();
    });

    socket.on('connect_error', (error) => {
      console.log('❌ WebSocket connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });

    // Try to connect
    socket.connect();

    // Wait a bit then test with auth
    setTimeout(async () => {
      console.log('\n🔐 Testing WebSocket with authentication...');
      
      // You'll need to get a valid token first
      const token = 'your-jwt-token-here'; // Replace with actual token
      
      if (token === 'your-jwt-token-here') {
        console.log('⚠️  Please set a valid JWT token in the script');
        return;
      }

      const authSocket = io('http://localhost:5000/chat', {
        transports: ['websocket'],
        auth: { token: `Bearer ${token}` },
        timeout: 5000,
        autoConnect: false,
      });

      authSocket.on('connect', () => {
        console.log('✅ Authenticated WebSocket connected successfully');
        authSocket.disconnect();
      });

      authSocket.on('connect_error', (error) => {
        console.log('❌ Authenticated WebSocket connection error:', error.message);
      });

      authSocket.on('disconnect', (reason) => {
        console.log('🔌 Authenticated WebSocket disconnected:', reason);
      });

      authSocket.connect();
    }, 3000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testWebSocketConnection();
