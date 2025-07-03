# Ado-Dad Chat System

This document explains how the chat system works for conversations between users who list ads and those who view them.

## Overview

The chat system allows users to have conversations about specific ads. When a user views an ad and wants to ask questions or negotiate, they can start a chat with the ad poster. All conversations are saved in the database and can be accessed later.

## Features

- **Ad-specific chats**: Each chat is tied to a specific ad
- **Real-time messaging**: Messages are delivered instantly via WebSocket
- **Message persistence**: All messages are saved in MongoDB
- **Read status tracking**: Track which messages have been read
- **User authentication**: Secure chat access with JWT authentication
- **REST API**: HTTP endpoints for chat management
- **WebSocket API**: Real-time messaging capabilities

## Database Schema

### Chat Collection

```javascript
{
  _id: ObjectId,
  participants: [ObjectId], // Array of user IDs (ad poster + viewer)
  contextType: "ad", // Type of context (always "ad" for ad chats)
  contextId: String, // The ad ID
  createdAt: Date,
  updatedAt: Date
}
```

### Message Collection

```javascript
{
  _id: ObjectId,
  chat: ObjectId, // Reference to chat
  sender: ObjectId, // Reference to user who sent the message
  content: String, // Message content
  read: Boolean, // Whether message has been read
  createdAt: Date
}
```

## API Endpoints

### REST API (HTTP)

#### Create Ad Chat

```http
POST /chat/ad/:adId
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "adPosterId": "user_id_of_ad_poster"
}
```

#### Get User Chats

```http
GET /chat/user
Authorization: Bearer <jwt_token>
```

#### Get Ad Chats

```http
GET /chat/ad/:adId
Authorization: Bearer <jwt_token>
```

#### Get Chat Messages

```http
GET /chat/:chatId/messages
Authorization: Bearer <jwt_token>
```

#### Send Message

```http
POST /chat/:chatId/messages
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "content": "Your message here"
}
```

#### Mark Messages as Read

```http
POST /chat/:chatId/read
Authorization: Bearer <jwt_token>
```

#### Get Unread Count

```http
GET /chat/:chatId/unread-count
Authorization: Bearer <jwt_token>
```

### WebSocket API

Connect to WebSocket namespace: `/chat`

#### Authentication

Connect with user ID in auth or query:

```javascript
const socket = io('http://localhost:3000/chat', {
  auth: { userId: 'your_user_id' },
  query: { userId: 'your_user_id' },
});
```

#### Events

**Client to Server:**

1. **createAdChat**

   ```javascript
   socket.emit(
     'createAdChat',
     {
       adId: 'ad_id',
       adPosterId: 'poster_user_id',
     },
     callback,
   );
   ```

2. **joinChat**

   ```javascript
   socket.emit('joinChat', { chatId: 'chat_id' }, callback);
   ```

3. **sendMessage**

   ```javascript
   socket.emit(
     'sendMessage',
     {
       chatId: 'chat_id',
       content: 'message content',
     },
     callback,
   );
   ```

4. **getUserChats**

   ```javascript
   socket.emit('getUserChats', {}, callback);
   ```

5. **getChatMessages**

   ```javascript
   socket.emit('getChatMessages', { chatId: 'chat_id' }, callback);
   ```

6. **markAsRead**
   ```javascript
   socket.emit('markAsRead', { chatId: 'chat_id' }, callback);
   ```

**Server to Client:**

1. **newMessage**
   ```javascript
   socket.on('newMessage', (message) => {
     console.log('New message:', message);
   });
   ```

## Usage Flow

### For Ad Viewers (Starting a Chat)

1. **View an ad** and decide to contact the poster
2. **Create a chat** for that specific ad:

   ```javascript
   // Via REST API
   const response = await fetch('/chat/ad/ad123', {
     method: 'POST',
     headers: {
       Authorization: 'Bearer your_jwt_token',
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       adPosterId: 'poster_user_id',
     }),
   });

   // Via WebSocket
   socket.emit(
     'createAdChat',
     {
       adId: 'ad123',
       adPosterId: 'poster_user_id',
     },
     (response) => {
       if (response.success) {
         console.log('Chat created:', response.chat);
       }
     },
   );
   ```

3. **Join the chat room** to receive real-time messages:

   ```javascript
   socket.emit('joinChat', { chatId: 'chat_id' });
   ```

4. **Send messages**:
   ```javascript
   socket.emit('sendMessage', {
     chatId: 'chat_id',
     content: "Hi, I'm interested in your ad!",
   });
   ```

### For Ad Posters (Receiving Messages)

1. **Get user chats** to see all conversations:

   ```javascript
   socket.emit('getUserChats', {}, (response) => {
     if (response.success) {
       response.chats.forEach((chat) => {
         console.log('Chat:', chat);
       });
     }
   });
   ```

2. **Join specific chats** to participate:

   ```javascript
   socket.emit('joinChat', { chatId: 'chat_id' });
   ```

3. **Receive real-time messages**:
   ```javascript
   socket.on('newMessage', (message) => {
     console.log('New message from viewer:', message.content);
   });
   ```

## Testing

Use the provided test page at `http://localhost:3000/socket-test.html` to test the chat functionality:

1. **Connect** with a user ID
2. **Create an ad chat** by providing ad ID and poster ID
3. **Join the chat** and start sending messages
4. **Test with multiple browser tabs** to simulate different users

## Security Considerations

- All WebSocket connections require user authentication
- Users can only access chats they are participants in
- Messages are validated and sanitized
- JWT tokens are required for REST API access

## Error Handling

The system provides detailed error messages for common issues:

- **Unauthorized**: User not authenticated
- **Invalid message data**: Missing required fields
- **Chat not found**: Invalid chat ID
- **User not participant**: User trying to access chat they're not part of

## Monitoring

The chat system includes comprehensive logging:

- Connection/disconnection events
- Message sending/receiving
- Chat creation and joining
- Error conditions

Check server logs for detailed information about chat activity.

## Integration with Frontend

To integrate this chat system with your frontend:

1. **User Authentication**: Ensure users are authenticated with JWT tokens
2. **Ad Display**: Show "Contact Seller" button on ad pages
3. **Chat Interface**: Create a chat UI that connects to the WebSocket
4. **Message History**: Load previous messages when opening a chat
5. **Real-time Updates**: Listen for new messages and update UI accordingly

## Example Frontend Integration

```javascript
// Connect to chat system
const socket = io('http://localhost:3000/chat', {
  auth: { userId: currentUser.id },
});

// Handle new messages
socket.on('newMessage', (message) => {
  // Add message to chat UI
  addMessageToChat(message);
});

// Start chat for an ad
function startAdChat(adId, adPosterId) {
  socket.emit('createAdChat', { adId, adPosterId }, (response) => {
    if (response.success) {
      // Open chat interface
      openChat(response.chat._id);
    }
  });
}

// Send message
function sendMessage(chatId, content) {
  socket.emit('sendMessage', { chatId, content }, (response) => {
    if (response.success) {
      // Message sent successfully
      console.log('Message sent');
    }
  });
}
```
