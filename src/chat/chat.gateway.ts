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
import { UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';

@WebSocketGateway({
  cors: true,
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

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody('chatId') chatId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) {
      this.logger.warn(`Unauthorized attempt to join chat ${chatId}`);
      return { error: 'Unauthorized' };
    }

    this.logger.log(`User ${userId} joining chat ${chatId}`);
    client.join(chatId);

    // Mark messages as read when joining
    await this.chatService.markMessagesAsRead(chatId, userId);

    return { success: true, chatId };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { chatId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.connectedUsers.get(client.id);
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

      // Emit to all users in the chat room
      this.server.to(data.chatId).emit('newMessage', {
        id: message._id,
        chat: message.chat,
        sender: message.sender,
        content: message.content,
        createdAt: (message as any).createdAt,
        read: message.read,
      });

      this.logger.log(`Message sent successfully by user ${userId}`);
      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { error: 'Failed to send message' };
    }
  }

  @SubscribeMessage('createAdChat')
  async handleCreateAdChat(
    @MessageBody() data: { adId: string; adPosterId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) {
      this.logger.warn(`Unauthorized attempt to create ad chat`);
      return { error: 'Unauthorized' };
    }

    try {
      this.logger.log(
        `Creating ad chat for ad ${data.adId} between ${data.adPosterId} and ${userId}`,
      );

      const chat = await this.chatService.createAdChat(
        data.adId,
        data.adPosterId,
        userId,
      );

      // Join the chat room
      client.join((chat._id as any).toString());

      this.logger.log(`Ad chat created successfully: ${chat._id}`);
      return { success: true, chat };
    } catch (error) {
      this.logger.error(`Error creating ad chat: ${error.message}`);
      return { error: 'Failed to create chat' };
    }
  }

  @SubscribeMessage('getUserChats')
  async handleGetUserChats(@ConnectedSocket() client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) {
      this.logger.warn(`Unauthorized attempt to get user chats`);
      return { error: 'Unauthorized' };
    }

    try {
      const chats = await this.chatService.getUserChats(userId);
      this.logger.log(`Retrieved ${chats.length} chats for user ${userId}`);
      return { success: true, chats };
    } catch (error) {
      this.logger.error(`Error getting user chats: ${error.message}`);
      return { error: 'Failed to get chats' };
    }
  }

  @SubscribeMessage('getChatMessages')
  async handleGetChatMessages(
    @MessageBody('chatId') chatId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.connectedUsers.get(client.id);
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

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody('chatId') chatId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.connectedUsers.get(client.id);
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
