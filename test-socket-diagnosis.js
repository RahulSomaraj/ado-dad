const io = require('socket.io-client');
const axios = require('axios');

const SERVER_URL = 'http://localhost:5000';

async function testSocketConnection() {
  console.log('🔍 Testing Socket Connection...\n');

  try {
    // Step 1: Get authentication token
    console.log('1. Getting authentication token...');
    const loginResponse = await axios.post(`${SERVER_URL}/auth/login`, {
      username: 'user@example.com',
      password: '123456',
    });

    if (
      !loginResponse.data.token &&
      !loginResponse.data.access_token &&
      !loginResponse.data.accessToken
    ) {
      console.error('❌ No token found in login response:', loginResponse.data);
      return;
    }

    const token =
      loginResponse.data.token ||
      loginResponse.data.access_token ||
      loginResponse.data.accessToken;
    console.log('✅ Token obtained:', token.substring(0, 20) + '...');

    // Step 2: Test socket connection
    console.log('\n2. Testing socket connection...');

    const socket = io(`${SERVER_URL}/chat`, {
      transports: ['websocket'],
      auth: { token: token },
      timeout: 10000,
      autoConnect: false,
    });

    // Set up event listeners
    socket.on('connect', () => {
      console.log('✅ Socket connected successfully!');
      console.log('   Socket ID:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      console.error('   Error details:', error);
    });

    socket.on('connected', (data) => {
      console.log('✅ Connection confirmed by server:', data);
    });

    socket.on('pong', (data) => {
      console.log('🏓 Pong received:', data);
    });

    // Connect to socket
    console.log('   Attempting to connect...');
    socket.connect();

    // Wait a bit then test ping
    setTimeout(() => {
      if (socket.connected) {
        console.log('\n3. Testing ping...');
        socket.emit('ping');
      } else {
        console.log('\n❌ Socket not connected, cannot test ping');
      }
    }, 2000);

    // Wait a bit more then disconnect
    setTimeout(() => {
      console.log('\n4. Disconnecting...');
      socket.disconnect();
      process.exit(0);
    }, 5000);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

// Run the test
testSocketConnection();
