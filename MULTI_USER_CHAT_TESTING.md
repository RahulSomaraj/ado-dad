# 🧪 Multi-User Chat Testing Guide

## Overview

This guide shows you how to test if the ad creator receives messages from other users who are interested in their ad.

## 🎯 Test Scenarios

### Scenario 1: Ad Creator vs Chat User

- **Ad Creator**: The person who posted the ad
- **Chat User**: Someone interested in the ad who wants to chat

### Scenario 2: Multiple Chat Users

- **Ad Creator**: Receives messages from multiple interested users
- **Chat User 1**: First person interested in the ad
- **Chat User 2**: Second person interested in the ad

## 🔔 Automatic Notification System

### How It Works

1. **First User** creates a chat for an ad
2. **System** automatically:
   - Creates the chat in the database
   - Finds the ad creator (second user)
   - Sends real-time notification to the ad creator
   - Automatically joins the ad creator to the chat room
   - Updates the ad creator's chat list
3. **Ad Creator** receives notification and can start messaging immediately

### Real-Time Events

- `newChatCreated`: Fired when a new chat is created
- `newMessage`: Fired when a new message is sent
- Automatic chat list refresh for both users

## 🚀 Testing Methods

### Method 1: Automated Test Script

```bash
# Run the automated test
node test-multi-user-chat.js
```

This script will:

1. Connect two users to the chat
2. Create a chat from the first user
3. Automatically notify the second user
4. Send messages between them
5. Show real-time message delivery

### Method 2: Manual Testing with Browser Tabs

#### Step 1: Open Two Browser Tabs

1. Open `chat-test-frontend.html` in two different browser tabs
2. Or use different browsers (Chrome + Firefox)

#### Step 2: Connect Both Users

**Tab 1 - Ad Creator:**

- User ID: `507f1f77bcf86cd799439011`
- JWT Token: (use helper script to generate)
- Click "Connect"

**Tab 2 - Chat User:**

- User ID: `507f1f77bcf86cd799439012`
- JWT Token: (use helper script to generate)
- Click "Connect"

#### Step 3: Create Chat (Automatic for Second User)

1. **Tab 1 (Chat User)**: Enter the Ad ID (e.g., `507f1f77bcf86cd799439021`)
2. **Tab 1 (Chat User)**: Click "Create Ad Chat"
3. **Tab 2 (Ad Creator)**: Should automatically receive notification and see the new chat
4. **Both tabs**: Switch to "Chats" tab
5. **Both tabs**: The chat should appear in both users' lists automatically

#### Step 4: Test Messaging

1. **Chat User tab**: Type a message like "Hi! Is this still available?"
2. **Chat User tab**: Click "Send"
3. **Ad Creator tab**: Should see the message appear in real-time
4. **Ad Creator tab**: Reply with "Yes, it's still available!"
5. **Chat User tab**: Should see the reply in real-time

## 🔍 What to Look For

### ✅ Success Indicators

- [ ] First user can create a chat
- [ ] Second user automatically receives notification about new chat
- [ ] Chat appears in both users' lists automatically
- [ ] Messages sent by Chat User appear for Ad Creator
- [ ] Messages sent by Ad Creator appear for Chat User
- [ ] Real-time message delivery (no page refresh needed)
- [ ] Messages show correct sender information
- [ ] Chat history persists between sessions

### ❌ Failure Indicators

- [ ] "Ad not found" errors (use real ad ID from database)
- [ ] Second user doesn't receive notification about new chat
- [ ] Chat doesn't appear automatically for second user
- [ ] Messages not appearing for other user
- [ ] Connection errors
- [ ] Messages showing wrong sender
- [ ] Chat not created successfully

## 🛠️ Troubleshooting

### Common Issues

1. **"Ad not found" error**

   - Use a real ad ID from your database
   - Check if the ad exists and has a valid `postedBy` field

2. **Messages not appearing**

   - Ensure both users are connected to the same chat
   - Check browser console for errors
   - Verify Socket.IO connection status

3. **Connection errors**
   - Ensure server is running on port 5000
   - Check CORS settings
   - Verify JWT tokens are valid

### Debug Steps

1. **Check Server Logs**

   ```bash
   # Look for these log messages:
   # "Creating ad chat for ad [ID] with user [ID]"
   # "Ad chat created successfully: [CHAT_ID]"
   # "User [ID] sending message to chat [CHAT_ID]"
   ```

2. **Check Browser Console**

   - Look for Socket.IO connection messages
   - Check for JavaScript errors
   - Verify message events are firing

3. **Check Database**

   ```javascript
   // Verify chat was created
   db.chats.findOne({ contextId: 'YOUR_AD_ID' });

   // Verify messages were saved
   db.messages.find({ chat: 'CHAT_ID' });
   ```

## 📊 Expected Results

### Database Records

After successful testing, you should see:

1. **Chat Record:**

   ```json
   {
     "_id": "CHAT_ID",
     "participants": ["AD_CREATOR_ID", "CHAT_USER_ID"],
     "contextType": "ad",
     "contextId": "AD_ID",
     "createdAt": "2024-01-01T00:00:00.000Z"
   }
   ```

2. **Message Records:**
   ```json
   {
     "_id": "MESSAGE_ID",
     "chat": "CHAT_ID",
     "sender": "SENDER_ID",
     "content": "Message content",
     "createdAt": "2024-01-01T00:00:00.000Z"
   }
   ```

### Real-Time Events

- `newMessage` events should fire for both users
- Message content should match what was sent
- Sender ID should be correct
- Chat ID should be the same for both users

## 🎯 Advanced Testing

### Test Multiple Chat Users

1. Open 3 browser tabs
2. Use 3 different user IDs
3. Create the same chat from all 3 users
4. Send messages from different users
5. Verify Ad Creator receives all messages

### Test Chat History

1. Send messages between users
2. Refresh both browser tabs
3. Reconnect to the chat
4. Verify all previous messages are loaded

### Test Offline/Online

1. Send messages while both users are online
2. Disconnect one user
3. Send message from connected user
4. Reconnect the other user
5. Verify they receive the message

## 📝 Test Checklist

- [ ] Both users can connect to chat namespace
- [ ] Both users can create the same chat
- [ ] Chat appears in both users' chat lists
- [ ] Messages sent by Chat User reach Ad Creator
- [ ] Messages sent by Ad Creator reach Chat User
- [ ] Real-time message delivery works
- [ ] Message history persists after reconnection
- [ ] Correct sender information is displayed
- [ ] No duplicate messages
- [ ] No message loss during testing
