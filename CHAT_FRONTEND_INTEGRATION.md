## Chat Frontend Integration Guide (Socket.IO)

This guide shows a step-by-step approach to create and use chats from the frontend with the current backend implementation.

### Prerequisites

- Obtain a login Bearer token via the REST login API.
- API base URL: set `BASE_URL` to your environment (e.g., `https://uat.ado-dad.com`).
- WebSocket namespace: `/chat` (Socket.IO).

### Connection (initial step)

- Pass the Bearer token in the Socket.IO `auth` payload as `token`.
- For the current backend, also include the `userId` in `auth` so the server can map your socket to your user (temporary until WS guard is applied end-to-end).

```javascript
import { io } from 'socket.io-client';

export function connectChat({ baseUrl, token, userId }) {
  const socket = io(`${baseUrl}/chat`, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    timeout: 10000,
    auth: {
      token: `Bearer ${token}`, // picked up by ws-guard (when enabled)
      userId, // required by current gateway mapping
    },
  });

  // Observers
  socket.on('connect', () => console.log('chat connected', socket.id));
  socket.on('disconnect', (reason) => console.log('chat disconnected', reason));
  socket.on('connect_error', (err) =>
    console.error('chat connect_error', err.message),
  );
  socket.on('newMessage', (msg) => console.log('newMessage', msg));
  socket.on('newChatCreated', (evt) => console.log('newChatCreated', evt));

  return socket;
}
```

### Step 1: Create or open a chat for an Ad

Emit `createAdChat` with the ad ID. Use an ack callback to receive `{ success, chat }` or `{ error }`.

```javascript
socket.emit('createAdChat', { adId }, (resp) => {
  if (resp?.success) {
    const chatId = resp.chat._id;
    // proceed to join
  } else {
    console.error('createAdChat failed', resp?.error);
  }
});
```

The server will also emit `newChatCreated` to the other participant if a brand-new chat was created.

### Step 2: Join the chat room (enables realtime messages)

```javascript
socket.emit('joinChat', { chatId }, (resp) => {
  if (!resp?.success) console.error('joinChat failed', resp?.error);
});
```

Joining marks your unread messages in that chat as read on the server.

### Step 3: Send a message

```javascript
socket.emit('sendMessage', { chatId, content }, (resp) => {
  if (!resp?.success) console.error('sendMessage failed', resp?.error);
});

// Listen for new messages (from you or the other user)
socket.on('newMessage', (message) => {
  // { id, chat, sender, content, createdAt, read }
});
```

### Step 4: List your chats

```javascript
socket.emit('getUserChats', null, (resp) => {
  if (resp?.success) {
    // resp.chats is an array with last message info
  } else {
    console.error('getUserChats failed', resp?.error);
  }
});
```

### Step 5: Fetch messages in a chat

```javascript
socket.emit('getChatMessages', { chatId }, (resp) => {
  if (resp?.success) {
    // resp.messages is an array of messages
  } else {
    console.error('getChatMessages failed', resp?.error);
  }
});
```

### Step 6: Mark messages as read (optional explicit)

```javascript
socket.emit('markAsRead', { chatId }, (resp) => {
  if (!resp?.success) console.error('markAsRead failed', resp?.error);
});
```

### React-hook example (optional)

```javascript
import { useEffect, useRef, useState } from 'react';
import { connectChat } from './chat-connection';

export function useChat({ baseUrl, token, userId }) {
  const socketRef = useRef();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = connectChat({ baseUrl, token, userId });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    return () => socket.close();
  }, [baseUrl, token, userId]);

  return {
    connected,
    createAdChat: (adId) =>
      new Promise((resolve) =>
        socketRef.current.emit('createAdChat', { adId }, resolve),
      ),
    joinChat: (chatId) =>
      new Promise((resolve) =>
        socketRef.current.emit('joinChat', { chatId }, resolve),
      ),
    sendMessage: (chatId, content) =>
      new Promise((resolve) =>
        socketRef.current.emit('sendMessage', { chatId, content }, resolve),
      ),
    getUserChats: () =>
      new Promise((resolve) =>
        socketRef.current.emit('getUserChats', null, resolve),
      ),
    getChatMessages: (chatId) =>
      new Promise((resolve) =>
        socketRef.current.emit('getChatMessages', { chatId }, resolve),
      ),
    markAsRead: (chatId) =>
      new Promise((resolve) =>
        socketRef.current.emit('markAsRead', { chatId }, resolve),
      ),
  };
}
```

### Security notes

- For production, prefer validating the token server-side via a WebSocket guard and extract the user from the token. The repository includes a `WsJwtGuard` that reads `auth.token` or `Authorization`.
- Until the guard is enforced on the gateway, the `userId` in `auth` is required for mapping. Keep both `token` and `userId` in your client `auth` payload.

### Debug tips

- Use `public/socket-test.html` or `public/socket-debug.html` as references for quick socket testing.
- Ensure your token includes the `Bearer ` prefix when sending in `auth.token`.
- Namespace must be `/chat`.

### Minimal test plan

1. Connect with valid token and userId and observe `connect`.
2. Emit `createAdChat` with a valid `adId`; expect `{ success: true, chat }`.
3. Emit `joinChat` with the new `chatId`; expect `{ success: true }`.
4. Emit `sendMessage`; expect `newMessage` broadcast and ack success.
5. Open a second client as the other user and verify room delivery and `newChatCreated`.
