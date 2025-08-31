import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { UseGuards, Logger, ForbiddenException } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guard/ws-guard';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: false,
  },
  namespace: '/chat',
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, string>(); // socketId -> userId

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // Try to authenticate on connect and map user → socket
    try {
      const rawAuth = (
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers['authorization'] as string) ||
        ''
      ).toString();
      const bearer = rawAuth.replace(/^Bearer\s+/i, '').trim();
      // Debug masked token for WS connect
      const masked = bearer
        ? `${bearer.slice(0, 10)}...${bearer.slice(-6)} (len:${bearer.length})`
        : '(empty)';
      this.logger.log(`WS connect token: ${masked}`);
      if (!bearer) {
        this.logger.warn(`Client ${client.id} connected without token`);
        return;
      }

      // Prefer token header alg; fallback try HS then RS if unknown
      const decodedHdr: any = jwt.decode(bearer, { complete: true });
      const alg: string | undefined = decodedHdr?.header?.alg;
      let payload: any | null = null;

      this.logger.log(
        `JWT alg detected: ${alg || 'unknown'}, TOKEN_KEY: ${!!process.env.TOKEN_KEY}, JWT_PUBLIC_KEY: ${!!process.env.JWT_PUBLIC_KEY}`,
      );

      if (alg?.startsWith('HS')) {
        const hsKey =
          process.env.TOKEN_KEY || 'default-secret-key-change-in-production';
        try {
          payload = jwt.verify(bearer, hsKey, { algorithms: ['HS256'] });
          this.logger.log(`HS256 verification successful`);
        } catch (e) {
          this.logger.warn(`HS256 verification failed: ${(e as any)?.message}`);
        }
      } else if (alg?.startsWith('RS')) {
        const rsKey = process.env.JWT_PUBLIC_KEY;
        if (!rsKey) {
          this.logger.warn('JWT_PUBLIC_KEY not set for RS token');
          return;
        }
        try {
          payload = jwt.verify(bearer, rsKey, { algorithms: ['RS256'] });
          this.logger.log(`RS256 verification successful`);
        } catch (e) {
          this.logger.warn(`RS256 verification failed: ${(e as any)?.message}`);
        }
      } else {
        // Unknown alg; attempt HS then RS
        this.logger.log(`Unknown alg ${alg}, attempting fallback verification`);
        const hsKey = process.env.TOKEN_KEY;
        const rsKey = process.env.JWT_PUBLIC_KEY;
        if (hsKey) {
          try {
            payload = jwt.verify(bearer, hsKey, { algorithms: ['HS256'] });
            this.logger.log(`Fallback HS256 verification successful`);
          } catch (e) {
            this.logger.warn(
              `Fallback HS256 verification failed: ${(e as any)?.message}`,
            );
          }
        }
        if (!payload && rsKey) {
          try {
            payload = jwt.verify(bearer, rsKey, { algorithms: ['RS256'] });
            this.logger.log(`Fallback RS256 verification successful`);
          } catch (e) {
            this.logger.warn(
              `Fallback RS256 verification failed: ${(e as any)?.message}`,
            );
          }
        }
        if (!payload) {
          this.logger.warn(
            `JWT key not configured or verification failed (alg: ${alg || 'unknown'})`,
          );
          return;
        }
      }
      const userId = payload?.id || payload?.sub;
      console.log('userId', userId);
      if (userId) {
        (client as any).user = { id: userId, roles: payload?.roles };
        this.connectedUsers.set(client.id, userId);
        this.logger.log(`User ${userId} mapped to socket ${client.id}`);
      } else {
        this.logger.warn(`Client ${client.id} token missing id/sub`);
      }
    } catch (e) {
      this.logger.warn(
        `Client ${client.id} provided invalid token: ${(e as any)?.message || e}`,
      );
    }

    // Log all incoming events for this client for debugging
    try {
      client.onAny((event, ...args) => {
        let preview = '';
        try {
          preview = JSON.stringify(args, (k, v) => {
            if (typeof v === 'string' && v.length > 200)
              return v.slice(0, 200) + '…';
            return v;
          });
          if (preview.length > 1000) preview = preview.slice(0, 1000) + '…';
        } catch {
          preview = '[unserializable]';
        }
        this.logger.log(`WS <- ${event} from ${client.id}: ${preview}`);
      });
      client.on('error', (err: any) => {
        this.logger.warn(
          `WS error from ${client.id}: ${(err && err.message) || err}`,
        );
      });
    } catch {}
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedUsers.delete(client.id);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody('chatId') chatId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId =
      (client as any).user?.id || this.connectedUsers.get(client.id);
    if (!userId) {
      this.logger.warn(`Unauthorized attempt to join chat ${chatId}`);
      return { error: 'Unauthorized' };
    }

    // authorize membership (sender must be a participant)
    const isMember = await this.chatService.isParticipant(chatId, userId);
    if (!isMember) throw new ForbiddenException('Not a chat participant');

    this.logger.log(`User ${userId} joining chat ${chatId}`);
    client.join(chatId);

    // Mark messages as read when joining
    await this.chatService.markMessagesAsRead(chatId, userId);

    return { success: true, chatId };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { chatId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId =
      (client as any).user?.id || this.connectedUsers.get(client.id);
    if (!userId) {
      this.logger.warn(`Unauthorized attempt to send message`);
      return { error: 'Unauthorized' };
    }

    if (!data.content || !data.chatId) {
      this.logger.warn(`Invalid message data from user ${userId}`);
      return { error: 'Invalid message data' };
    }

    try {
      this.logger.log(`User ${userId} sending message to chat ${data.chatId}`);

      const message = await this.chatService.sendMessage(
        data.chatId,
        userId,
        data.content,
      );

      if (!message) {
        this.logger.warn(`sendMessage returned null for chat ${data.chatId}`);
        return { error: 'Failed to send message' };
      }

      // Ensure sender is in the room (idempotent)
      client.join(data.chatId);

      // Emit to all users in the chat room (compat: newMessage and message)
      const payload = {
        id: (message as any)._id?.toString?.() ?? (message as any)._id,
        chat: (message as any).chat?.toString?.() ?? (message as any).chat,
        sender:
          (message as any).sender?.toString?.() ?? (message as any).sender,
        content: message.content,
        createdAt: (message as any).createdAt ?? new Date(),
        read: message.read,
      } as any;
      this.server.to(data.chatId).emit('newMessage', payload);
      this.server
        .to(data.chatId)
        .emit('message', { chatId: data.chatId, message: payload });

      this.logger.log(`Message sent successfully by user ${userId}`);
      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { error: 'Failed to send message' };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('createAdChat')
  async handleCreateAdChat(
    @MessageBody() data: { adId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId =
      (client as any).user?.id || this.connectedUsers.get(client.id);
    if (!userId) {
      this.logger.warn(`Unauthorized attempt to create ad chat`);
      return { error: 'Unauthorized' };
    }

    try {
      this.logger.log(
        `Creating ad chat for ad ${data.adId} with user ${userId}`,
      );

      const result = await this.chatService.createAdChat(data.adId, userId);
      const { chat, adPosterId, viewerId, isNewChat } = result;

      // Join the chat room
      client.join((chat._id as any).toString());

      this.logger.log(`Ad chat created successfully: ${chat._id}`);

      // If this is a new chat, notify the other participant
      if (isNewChat) {
        const otherUserId = userId === adPosterId ? viewerId : adPosterId;
        this.notifyNewChat(otherUserId, chat, data.adId);
      }

      return { success: true, chat };
    } catch (error) {
      this.logger.error(`Error creating ad chat: ${error.message}`);
      return { error: error.message || 'Failed to create chat' };
    }
  }

  private notifyNewChat(otherUserId: string, chat: any, adId: string) {
    // Find the socket connection for the other user
    let otherUserSocketId: string | null = null;
    for (const [socketId, userId] of this.connectedUsers.entries()) {
      if (userId === otherUserId) {
        otherUserSocketId = socketId;
        break;
      }
    }

    if (otherUserSocketId) {
      // Automatically join the other user to the chat room
      // Robust: join by socket id without relying on internal maps
      this.server
        .in(otherUserSocketId)
        .socketsJoin((chat._id as any).toString());

      // Notify the other user about the new chat
      this.server.to(otherUserSocketId).emit('newChatCreated', {
        chatId: chat._id,
        adId: adId,
        message: 'Someone is interested in your ad!',
      });

      this.logger.log(
        `Notified user ${otherUserId} about new chat ${chat._id} and joined them to the room`,
      );
    } else {
      this.logger.log(
        `User ${otherUserId} is not currently online, chat will appear when they connect`,
      );
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('getUserChats')
  async handleGetUserChats(@ConnectedSocket() client: Socket) {
    const userId =
      (client as any).user?.id || this.connectedUsers.get(client.id);
    if (!userId) {
      this.logger.warn(`Unauthorized attempt to get user chats`);
      return { error: 'Unauthorized' };
    }

    try {
      const chats = await this.chatService.getUserChatsWithLastMessage(userId);
      this.logger.log(`Retrieved ${chats.length} chats for user ${userId}`);
      return { success: true, chats };
    } catch (error) {
      this.logger.error(`Error getting user chats: ${error.message}`);
      return { error: 'Failed to get chats' };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('getChatMessages')
  async handleGetChatMessages(
    @MessageBody('chatId') chatId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId =
      (client as any).user?.id || this.connectedUsers.get(client.id);
    if (!userId) {
      this.logger.warn(`Unauthorized attempt to get chat messages`);
      return { error: 'Unauthorized' };
    }

    try {
      const messages = await this.chatService.getMessages(chatId);
      this.logger.log(
        `Retrieved ${messages.length} messages for chat ${chatId}`,
      );
      return { success: true, messages };
    } catch (error) {
      this.logger.error(`Error getting chat messages: ${error.message}`);
      return { error: 'Failed to get messages' };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody('chatId') chatId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId =
      (client as any).user?.id || this.connectedUsers.get(client.id);
    if (!userId) {
      this.logger.warn(`Unauthorized attempt to mark messages as read`);
      return { error: 'Unauthorized' };
    }

    try {
      await this.chatService.markMessagesAsRead(chatId, userId);
      this.logger.log(
        `Messages marked as read for user ${userId} in chat ${chatId}`,
      );
      return { success: true };
    } catch (error) {
      this.logger.error(`Error marking messages as read: ${error.message}`);
      return { error: 'Failed to mark messages as read' };
    }
  }
}
