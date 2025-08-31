import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { WsJwtGuard } from '../auth/guard/ws-guard';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
@UseGuards(WsJwtGuard)
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, Socket>();

  constructor(private readonly chatService: ChatService) {}

  afterInit(server: Server) {
    this.logger.log('🚀 Chat Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`🔌 New connection attempt from client ${client.id}`);

      // Get user from authenticated socket
      const user = (client as any).user;
      if (!user || !user.id) {
        this.logger.warn(
          `❌ Unauthenticated connection attempt from ${client.id}`,
        );
        client.disconnect();
        return;
      }

      const userId = user.id;
      this.connectedUsers.set(userId, client);

      this.logger.log(`✅ User ${userId} connected (Socket ID: ${client.id})`);

      // Send connection confirmation
      client.emit('connected', {
        success: true,
        userId: userId,
        socketId: client.id,
        message: 'Successfully connected to chat server',
      });
    } catch (error) {
      this.logger.error('❌ Connection error:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    try {
      const user = (client as any).user;
      const userId = user?.id || `unknown_${client.id}`;
      this.connectedUsers.delete(userId);
      this.logger.log(
        `🔌 User ${userId} disconnected (Socket ID: ${client.id})`,
      );
    } catch (error) {
      this.logger.error('❌ Disconnect error:', error.message);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    this.logger.log(`🏓 Ping from ${client.id}`);
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  @SubscribeMessage('createChatRoom')
  async handleCreateChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { adId: string },
  ) {
    try {
      const user = (client as any).user;
      const userId = user.id;

      this.logger.log(
        `Creating chat room for ad ${data.adId} by user ${userId}`,
      );

      const chatRoom = await this.chatService.createChatRoom(userId, data.adId);

      // Join the user to the chat room
      await client.join(chatRoom.roomId);

      // Notify all participants about the new chat room
      this.server.to(chatRoom.roomId).emit('chatRoomCreated', {
        success: true,
        chatRoom: {
          roomId: chatRoom.roomId,
          initiatorId: chatRoom.initiatorId,
          adId: chatRoom.adId,
          adPosterId: chatRoom.adPosterId,
          participants: chatRoom.participants,
          status: chatRoom.status,
          createdAt: (chatRoom as any).createdAt,
        },
        message: 'Chat room created successfully',
      });

      // Send acknowledgment to the creator
      client.emit('createChatRoomResponse', {
        success: true,
        chatRoom: {
          roomId: chatRoom.roomId,
          initiatorId: chatRoom.initiatorId,
          adId: chatRoom.adId,
          adPosterId: chatRoom.adPosterId,
          participants: chatRoom.participants,
          status: chatRoom.status,
          createdAt: (chatRoom as any).createdAt,
        },
        message: 'Chat room created successfully',
      });

      this.logger.log(`Chat room created: ${chatRoom.roomId}`);
    } catch (error) {
      this.logger.error(`Error creating chat room: ${error.message}`);
      client.emit('createChatRoomResponse', {
        success: false,
        error: error.message,
      });
    }
  }

  @SubscribeMessage('joinChatRoom')
  async handleJoinChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const user = (client as any).user;
      const userId = user.id;

      this.logger.log(`User ${userId} joining chat room ${data.roomId}`);

      const chatRoom = await this.chatService.getChatRoom(data.roomId);

      // Check if user is a participant
      if (!chatRoom.participants.includes(userId)) {
        client.emit('joinChatRoomResponse', {
          success: false,
          error: 'User is not a participant in this chat room',
        });
        return;
      }

      // Join the room
      await client.join(data.roomId);

      // Get user role
      const userRole = await this.chatService.getUserRole(data.roomId, userId);

      client.emit('joinChatRoomResponse', {
        success: true,
        roomId: data.roomId,
        userRole: userRole,
        message: `Successfully joined chat room: ${data.roomId}`,
      });

      // Notify other users in the room
      client.to(data.roomId).emit('userJoinedRoom', {
        userId: userId,
        roomId: data.roomId,
        userRole: userRole,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`User ${userId} joined chat room ${data.roomId}`);
    } catch (error) {
      this.logger.error(`Error joining chat room: ${error.message}`);
      client.emit('joinChatRoomResponse', {
        success: false,
        error: error.message,
      });
    }
  }

  @SubscribeMessage('leaveChatRoom')
  async handleLeaveChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const user = (client as any).user;
      const userId = user.id;

      await client.leave(data.roomId);

      client.emit('leaveChatRoomResponse', {
        success: true,
        roomId: data.roomId,
        message: `Successfully left chat room: ${data.roomId}`,
      });

      // Notify other users in the room
      client.to(data.roomId).emit('userLeftRoom', {
        userId: userId,
        roomId: data.roomId,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`User ${userId} left chat room ${data.roomId}`);
    } catch (error) {
      this.logger.error(`Error leaving chat room: ${error.message}`);
      client.emit('leaveChatRoomResponse', {
        success: false,
        error: error.message,
      });
    }
  }

  @SubscribeMessage('getUserChatRooms')
  async handleGetUserChatRooms(@ConnectedSocket() client: Socket) {
    try {
      const user = (client as any).user;
      const userId = user.id;

      const chatRooms = await this.chatService.getUserChatRooms(userId);

      client.emit('userChatRooms', {
        success: true,
        chatRooms: chatRooms.map((room) => ({
          roomId: room.roomId,
          initiatorId: room.initiatorId,
          adId: room.adId,
          adPosterId: room.adPosterId,
          participants: room.participants,
          status: room.status,
          lastMessageAt: room.lastMessageAt,
          messageCount: room.messageCount,
          createdAt: (room as any).createdAt,
        })),
      });
    } catch (error) {
      this.logger.error(`Error getting user chat rooms: ${error.message}`);
      client.emit('userChatRooms', {
        success: false,
        error: error.message,
      });
    }
  }

  // Utility method to get connected user count
  getConnectedUserCount(): number {
    return this.connectedUsers.size;
  }

  // Utility method to check if user is connected
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Utility method to get user's socket
  getUserSocket(userId: string): Socket | undefined {
    return this.connectedUsers.get(userId);
  }
}
