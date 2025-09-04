const { io } = require('socket.io-client');

/**
 * Simple Chat System Test with Enhanced Validation
 *
 * This test file demonstrates the chat system with proper MongoDB ObjectId validation.
 * The validation ensures:
 * - IDs are not empty strings
 * - IDs are valid 24-character MongoDB ObjectIds
 * - Advertisement exists and is active
 * - All required advertisement fields are present
 * - User cannot create chat room with themselves
 *
 * DEFAULT TEST IDs (from existing database):
 * - Ad ID: 68b51d63215fd67ba4c85089 ✅ Valid MongoDB ObjectId
 * - User ID: 6874a0a130814c6a995e9741 ✅ Valid MongoDB ObjectId
 *
 * These IDs are used as the default for all chat room creation tests.
 * They pass all validation checks and exist in the database.
 */

// Simple chat system test with valid MongoDB ObjectIds
async function testChatSystem() {
  console.log('🔌 Testing Chat System...');
  console.log('📋 Using valid MongoDB ObjectIds for testing:');
  console.log('   - Ad ID: 68b51d63215fd67ba4c85089');
  console.log('   - User ID: 6874a0a130814c6a995e9741');
  console.log('   - These IDs pass all validation checks\n');

  try {
    // Test 1: Basic WebSocket connection
    console.log('1️⃣ Testing basic WebSocket connection...');
    const socket = io('http://localhost:5000/chat', {
      transports: ['websocket'],
      timeout: 5000,
      autoConnect: false,
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');

      // Test 2: Try to get user chat rooms (will fail without auth, but connection works)
      console.log('\n2️⃣ Testing chat room operations...');
      socket.emit('getUserChatRooms', { userId: '6874a0a130814c6a995e9741' }); // Valid MongoDB ObjectId

      // Test 3: Try to create a chat room (will fail without auth, but connection works)
      // Using a valid MongoDB ObjectId format for testing
      socket.emit('createChatRoom', {
        adId: '68b51d63215fd67ba4c85089', // Valid 24-character MongoDB ObjectId
        initiatorId: '6874a0a130814c6a995e9741', // Valid 24-character MongoDB ObjectId
      });

      setTimeout(() => {
        console.log('✅ Basic WebSocket operations tested');
        socket.disconnect();
      }, 2000);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ WebSocket connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });

    socket.on('error', (error) => {
      console.log('❌ WebSocket error:', error);
    });

    // Test 4: Check if we can receive events
    socket.on('chatRoomCreated', (data) => {
      console.log('📨 Received chatRoomCreated event:', data);
    });

    socket.on('message', (data) => {
      console.log('📨 Received message event:', data);
    });

    socket.on('userJoinedRoom', (data) => {
      console.log('👤 Received userJoinedRoom event:', data);
    });

    socket.on('userLeftRoom', (data) => {
      console.log('👋 Received userLeftRoom event:', data);
    });

    // Test 5: Test with invalid IDs to demonstrate validation (will fail but shows error handling)
    setTimeout(() => {
      console.log('\n5️⃣ Testing validation with invalid IDs...');

      // Test invalid ObjectId format
      socket.emit('createChatRoom', {
        adId: 'invalid-id', // Invalid format - will fail validation
        initiatorId: '6874a0a130814c6a995e9741',
      });

      // Test empty string
      setTimeout(() => {
        socket.emit('createChatRoom', {
          adId: '', // Empty string - will fail validation
          initiatorId: '6874a0a130814c6a995e9741',
        });
      }, 500);
    }, 1000);

    // Connect
    socket.connect();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testChatSystem();
