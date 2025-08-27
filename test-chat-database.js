// Test script to verify chat creation and database persistence
const { MongoClient } = require('mongodb');

async function testChatDatabase() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('ado-dad');
    const chatsCollection = db.collection('chats');
    const messagesCollection = db.collection('messages');

    // Test 1: Check existing chats
    console.log('\n🧪 Test 1: Checking existing chats...');
    const existingChats = await chatsCollection.find({}).toArray();
    console.log(`Found ${existingChats.length} existing chats`);

    if (existingChats.length > 0) {
      console.log('Sample chat:', {
        id: existingChats[0]._id,
        participants: existingChats[0].participants,
        contextType: existingChats[0].contextType,
        contextId: existingChats[0].contextId,
        createdAt: existingChats[0].createdAt,
        updatedAt: existingChats[0].updatedAt,
      });
    }

    // Test 2: Check existing messages
    console.log('\n🧪 Test 2: Checking existing messages...');
    const existingMessages = await messagesCollection.find({}).toArray();
    console.log(`Found ${existingMessages.length} existing messages`);

    if (existingMessages.length > 0) {
      console.log('Sample message:', {
        id: existingMessages[0]._id,
        chat: existingMessages[0].chat,
        sender: existingMessages[0].sender,
        content: existingMessages[0].content,
        createdAt: existingMessages[0].createdAt,
      });
    }

    // Test 3: Create a test chat
    console.log('\n🧪 Test 3: Creating a test chat...');
    const testChat = {
      participants: ['user1', 'user2'],
      contextType: 'ad',
      contextId: 'test-ad-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await chatsCollection.insertOne(testChat);
    console.log('✅ Test chat created with ID:', result.insertedId);

    // Test 4: Verify the chat was saved
    console.log('\n🧪 Test 4: Verifying chat was saved...');
    const savedChat = await chatsCollection.findOne({ _id: result.insertedId });
    if (savedChat) {
      console.log('✅ Chat successfully saved to database');
      console.log('Chat details:', {
        id: savedChat._id,
        participants: savedChat.participants,
        contextType: savedChat.contextType,
        contextId: savedChat.contextId,
        createdAt: savedChat.createdAt,
        updatedAt: savedChat.updatedAt,
      });
    } else {
      console.log('❌ Chat not found in database');
    }

    // Test 5: Create a test message
    console.log('\n🧪 Test 5: Creating a test message...');
    const testMessage = {
      chat: result.insertedId,
      sender: 'user1',
      content: 'Hello, this is a test message!',
      createdAt: new Date(),
    };

    const messageResult = await messagesCollection.insertOne(testMessage);
    console.log('✅ Test message created with ID:', messageResult.insertedId);

    // Cleanup
    await chatsCollection.deleteOne({ _id: result.insertedId });
    await messagesCollection.deleteOne({ _id: messageResult.insertedId });
    console.log('\n🧹 Cleaned up test data');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n✅ Test completed');
  }
}

testChatDatabase();
