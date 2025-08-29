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

@WebSocketGateway({
  cors: {
    origin: (process.env as any).FRONTEND_URL || true,
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, string>(); // socketId -> userId

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // Extract user ID from auth token or query params
    const userId =
      client.handshake.auth.userId || client.handshake.query.userId;
    if (userId) {
      this.connectedUsers.set(client.id, userId);
      this.logger.log(`User ${userId} connected with socket ${client.id}`);
    } else {
      this.logger.warn(`Client ${client.id} connected without user ID`);
    }
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

  @SubscribeMessage('createAdChat')
  async handleCreateAdChat(
    @MessageBody() data: { adId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.connectedUsers.get(client.id);
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
      this.server.sockets.sockets
        .get(otherUserSocketId)
        ?.join((chat._id as any).toString());

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
