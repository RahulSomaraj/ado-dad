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
import { Logger, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { WsJwtGuard } from '../auth/guard/ws-guard';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { RateLimit } from './guards/rate-limit.guard';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
  },
  transports: ['websocket', 'polling'],
})
// @UseGuards(WsJwtGuard) // Temporarily disabled for debugging
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, Socket>();

  constructor(private readonly chatService: ChatService) {}

  // -------- Manual auth fallback (unchanged except minor logs) --------
  private async authenticateClient(client: Socket): Promise<boolean> {
    try {
      this.logger.log(`Manual authentication for client ${client.id}`);
      let token = '';
      if (client.handshake.auth?.token) {
        token = String(client.handshake.auth.token);
      } else if (client.handshake.headers['authorization']) {
        token = String(client.handshake.headers['authorization']);
      }
      if (!token) return false;
      const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
      if (!cleanToken) return false;

      const { verify } = await import('jsonwebtoken');
      const secret =
        process.env.TOKEN_KEY || 'default-secret-key-change-in-production';
      const payload = verify(cleanToken, secret, {
        algorithms: ['HS256'],
      }) as any;
      const userId = payload.id || payload.sub;
      if (!userId) return false;

      (client as any).user = { id: userId, roles: payload.roles };
      return true;
    } catch (e: any) {
      this.logger.warn(
        `JWT verification failed for ${client.id}: ${e.message}`,
      );
      return false;
    }
  }

  async afterInit(server: Server) {
    this.logger.log('🚀 Chat Gateway initialized');

    // Add catch-all listener for every packet in the /chat namespace
    // Use the Socket.IO server instance from the gateway
    if (this.server) {
      this.logger.log('📡 Setting up onAny listener for all events');

      // Listen for all events on the server
      this.server.on('connection', (sock) => {
        this.logger.log(`🔌 Socket connected: ${sock.id}`);

        // Use onAny to catch all events
        sock.onAny((event, ...args) => {
          const hasAck = typeof args[args.length - 1] === 'function';
          this.logger.log(`📥 onAny: ${event} (ack=${hasAck}) from ${sock.id}`);

          // Special logging for getUserChatRooms to debug the issue
          if (event === 'getUserChatRooms') {
            this.logger.log(`🔍 [onAny] getUserChatRooms event details:`);
            this.logger.log(`🔍 [onAny] args.length: ${args.length}`);
            this.logger.log(`🔍 [onAny] args:`, args);
            this.logger.log(
              `🔍 [onAny] last arg type: ${typeof args[args.length - 1]}`,
            );
            this.logger.log(
              `🔍 [onAny] last arg is function: ${typeof args[args.length - 1] === 'function'}`,
            );
            this.logger.log(`🔍 [onAny] first arg type: ${typeof args[0]}`);
            this.logger.log(`🔍 [onAny] first arg:`, args[0]);
          }

          // Special logging for createChatRoom to debug the issue
          if (event === 'createChatRoom') {
            this.logger.log(`🔍 [onAny] createChatRoom event details:`);
            this.logger.log(`🔍 [onAny] args.length: ${args.length}`);
            this.logger.log(`🔍 [onAny] args:`, args);
            this.logger.log(
              `🔍 [onAny] last arg type: ${typeof args[args.length - 1]}`,
            );
            this.logger.log(
              `🔍 [onAny] last arg is function: ${typeof args[args.length - 1] === 'function'}`,
            );
            this.logger.log(`🔍 [onAny] first arg type: ${typeof args[0]}`);
            this.logger.log(`🔍 [onAny] first arg:`, args[0]);
          }
        });
      });
    } else {
      this.logger.warn('⚠️ Server not initialized yet');
    }

    this.logger.log(
      '⚠️ Running in single-instance mode (Redis adapter not configured)',
    );
    this.logger.log('🔓 WsJwtGuard temporarily disabled for debugging');
  }

  async handleConnection(client: Socket) {
    try {
      this.logger.log(
        `🔌 [handleConnection] Client ${client.id} attempting connection`,
      );
      this.logger.log(`🔌 [handleConnection] Client handshake:`, {
        auth: client.handshake.auth,
        headers: client.handshake.headers,
      });

      // Try to authenticate the client properly
      const isAuthenticated = await this.authenticateClient(client);

      if (!isAuthenticated) {
        this.logger.warn(`❌ Authentication failed for client ${client.id}`);
        client.disconnect();
        return;
      }

      const userId = (client as any).user?.id;
      if (!userId) {
        this.logger.warn(`❌ No user ID found for client ${client.id}`);
        client.disconnect();
        return;
      }

      this.connectedUsers.set(userId, client);
      this.logger.log(`✅ User ${userId} connected (Socket ${client.id})`);

      client.emit('connected', {
        success: true,
        userId,
        socketId: client.id,
        message: 'Successfully connected to chat server',
      });
    } catch (e: any) {
      this.logger.error(`❌ Connection error: ${e.message}`);
      this.logger.error(`❌ Connection error stack: ${e.stack}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    try {
      const userId = (client as any).user?.id || `unknown_${client.id}`;
      this.connectedUsers.delete(userId);
      this.logger.log(`🔌 User ${userId} disconnected (Socket ${client.id})`);
    } catch (e: any) {
      this.logger.error(`❌ Disconnect error: ${e.message}`);
    }
  }

  // ---------- PING ----------
  @SubscribeMessage('ping')
  handlePing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { t0?: number },
  ) {
    this.logger.log('🏓 [ping] handler ENTER');
    this.logger.log(`🏓 [ping] client.id: ${client.id}`);
    this.logger.log(`🏓 [ping] payload:`, payload);

    try {
      this.logger.log(`🏓 Ping from ${client.id}`);
      const response = { ok: true, t0: payload?.t0, ts: Date.now() };
      this.logger.log('✅ [ping] Returning response:', response);
      return response;
    } catch (e: any) {
      this.logger.error(`❌ [ping] Error: ${e.message}`);
      const errorResponse = { ok: false, error: e.message };
      this.logger.log('✅ [ping] Returning error response:', errorResponse);
      return errorResponse;
    }
  }

  // ---------- SEND MESSAGE ----------
  @SubscribeMessage('sendMessage')
  // @RateLimit({
  //   maxRequests: 10,
  //   windowMs: 10000,
  //   message: 'Too many messages, please slow down',
  // })
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto,
    callback?: (response: any) => void,
  ) {
    this.logger.log(`🟢 [sendMessage] handler ENTER`);
    this.logger.log(`🟢 [sendMessage] client.id: ${client.id}`);
    this.logger.log(`🟢 [sendMessage] payload:`, payload);
    this.logger.log(`🟢 [sendMessage] callback exists: ${!!callback}`);

    try {
      const userId = (client as any).user?.id as string;
      if (!userId) {
        this.logger.error(
          `❌ [sendMessage] No user ID found for client ${client.id}`,
        );
        callback?.({ success: false, error: 'User not authenticated' });
        return;
      }

      this.logger.log(
        `🟢 [sendMessage] User ${userId} sending to ${payload.roomId}: ${payload.content}`,
      );

      const message = await this.chatService.sendMessage(
        payload.roomId,
        userId,
        payload.content,
        payload.type,
      );

      const out = {
        roomId: payload.roomId,
        content: message.content,
        senderId: userId,
        createdAt: (message as any).createdAt,
        _id: (message as any)._id,
        id: (message as any)._id,
      };

      this.logger.log(`🟢 [sendMessage] Broadcasting message:`, out);
      this.server.to(payload.roomId).emit('message', out);

      const response = {
        success: true,
        message: {
          id: (message as any)._id,
          _id: (message as any)._id,
          roomId: payload.roomId,
          senderId: userId,
          content: payload.content,
          type: message.type,
          createdAt: (message as any).createdAt,
        },
      };

      this.logger.log(`🟢 [sendMessage] Sending callback response:`, response);
      callback?.(response);
    } catch (e: any) {
      this.logger.error(`❌ [sendMessage] Error: ${e.message}`);
      this.logger.error(`❌ [sendMessage] Stack: ${e.stack}`);
      callback?.({ success: false, error: e.message });
    }
  }

  // ---------- CREATE CHAT ROOM ----------
  @SubscribeMessage('createChatRoom')
  async handleCreateChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CreateChatRoomDto,
  ) {
    this.logger.log('🟢 [createChatRoom] handler ENTER');
    this.logger.log(`🟢 [createChatRoom] client.id: ${client.id}`);
    this.logger.log(`🟢 [createChatRoom] payload:`, payload);

    try {
      const userId = (client as any).user.id as string;
      this.logger.log(`🟢 [createChatRoom] userId: ${userId}`);
      this.logger.log(`Creating chat for ad ${payload.adId} by ${userId}`);

      const chatRoom = await this.chatService.createChatRoom(
        userId,
        payload.adId,
      );
      await client.join(chatRoom.roomId);

      const response = {
        success: true,
        data: {
          roomId: chatRoom.roomId,
          initiatorId: chatRoom.initiatorId,
          adId: chatRoom.adId,
          adPosterId: chatRoom.adPosterId,
          participants: chatRoom.participants,
          status: chatRoom.status,
          createdAt: (chatRoom as any).createdAt,
        },
        message: 'Chat room created successfully',
      };

      this.logger.log('✅ [createChatRoom] Returning response:', response);

      // notify anyone already in the room (usually just creator at this moment)
      this.server.to(chatRoom.roomId).emit('chatRoomCreated', response);

      return response;
    } catch (e: any) {
      this.logger.error(`❌ [createChatRoom] Error: ${e.message}`);
      this.logger.error(`❌ [createChatRoom] Stack: ${e.stack}`);
      const errorResponse = { success: false, error: e.message };
      this.logger.log(
        '✅ [createChatRoom] Returning error response:',
        errorResponse,
      );
      return errorResponse;
    }
  }

  // ---------- JOIN CHAT ROOM ----------
  @SubscribeMessage('joinChatRoom')
  async handleJoinChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomDto,
    callback?: (response: any) => void,
  ) {
    try {
      const userId = (client as any).user.id as string;
      const roomId = payload.roomId;

      this.logger.log(`User ${userId} joining ${roomId}`);
      const chatRoom = await this.chatService.getChatRoom(roomId);

      // Normalize participant compare (ObjectId[] vs string)
      const isParticipant = (chatRoom.participants || []).some(
        (p: any) =>
          (typeof p === 'string' ? p : p?.toString?.()).toString() === userId,
      );
      if (!isParticipant) {
        const errorResponse = {
          success: false,
          error: 'User is not a participant in this chat room',
        };
        callback?.(errorResponse);
        client.emit('joinChatRoomResponse', errorResponse);
        return;
      }

      await client.join(roomId);

      const userRole = await this.chatService.getUserRole(roomId, userId);
      const response = {
        success: true,
        roomId,
        userRole,
        message: `Successfully joined chat room: ${roomId}`,
      };

      callback?.(response);

      // Notify others (not the joiner)
      client.to(roomId).emit('userJoinedRoom', {
        userId,
        roomId,
        userRole,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`User ${userId} joined ${roomId}`);
    } catch (e: any) {
      this.logger.error(`Error joining room: ${e.message}`);
      callback?.({ success: false, error: e.message });
    }
  }

  // ---------- LEAVE CHAT ROOM ----------
  @SubscribeMessage('leaveChatRoom')
  async handleLeaveChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
    callback?: (response: any) => void,
  ) {
    try {
      const userId = (client as any).user.id as string;
      await client.leave(data.roomId);

      callback?.({
        success: true,
        roomId: data.roomId,
        message: `Successfully left chat room: ${data.roomId}`,
      });

      client.to(data.roomId).emit('userLeftRoom', {
        userId,
        roomId: data.roomId,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`User ${userId} left ${data.roomId}`);
    } catch (e: any) {
      this.logger.error(`Error leaving room: ${e.message}`);
      callback?.({ success: false, error: e.message });
    }
  }

  // ---------- CHECK EXISTING CHAT ROOM ----------
  @SubscribeMessage('checkExistingChatRoom')
  async handleCheckExistingChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { adId: string },
    callback?: (response: any) => void,
  ) {
    try {
      const userId = (client as any).user?.id as string;
      if (!userId) {
        callback?.({ success: false, error: 'User not authenticated' });
        return;
      }

      this.logger.log(
        `🔍 Checking existing room for user ${userId} and ad ${payload.adId}`,
      );

      const existingRoom = await this.chatService.findExistingChatRoom(
        userId,
        payload.adId,
      );

      if (existingRoom) {
        this.logger.log(`✅ Found existing room: ${existingRoom.roomId}`);
        callback?.({
          success: true,
          exists: true,
          room: {
            roomId: existingRoom.roomId,
            initiatorId: existingRoom.initiatorId,
            adId: existingRoom.adId,
            adPosterId: existingRoom.adPosterId,
            participants: existingRoom.participants,
            status: existingRoom.status,
            lastMessageAt: existingRoom.lastMessageAt,
            messageCount: existingRoom.messageCount,
            createdAt: (existingRoom as any).createdAt,
          },
        });
      } else {
        this.logger.log(`❌ No existing room found`);
        callback?.({
          success: true,
          exists: false,
          room: null,
        });
      }
    } catch (e: any) {
      this.logger.error(`❌ [checkExistingChatRoom] Error: ${e.message}`);
      callback?.({ success: false, error: e.message });
    }
  }

  // ---------- GET USER CHAT ROOMS (manual event handling) ----------
  @SubscribeMessage('getUserChatRooms')
  async handleGetUserChatRooms(
    @ConnectedSocket() client: Socket,
    @MessageBody() maybePayload: any,
    maybeCallback?: (response: any) => void,
  ) {
    this.logger.log('🟢 [getUserChatRooms] handler ENTER');
    this.logger.log(`🟢 [getUserChatRooms] client.id: ${client.id}`);
    this.logger.log(
      `🟢 [getUserChatRooms] maybePayload type: ${typeof maybePayload}, value:`,
      maybePayload,
    );
    this.logger.log(
      `🟢 [getUserChatRooms] maybeCallback type: ${typeof maybeCallback}, exists: ${!!maybeCallback}`,
    );

    // Since NestJS is not passing the callback correctly, let's handle it manually
    // We'll use the onAny listener data to get the actual callback
    let callback: ((response: any) => void) | undefined;

    // Try to find the callback from the onAny data
    if (this.server) {
      // This is a workaround - we'll emit the response and let the client handle it
      this.logger.log('🟢 [getUserChatRooms] Using manual callback handling');
    }

    try {
      const userId = (client as any).user?.id as string;
      this.logger.log('🟢 [getUserChatRooms] userId:', userId);
      this.logger.log(
        '🟢 [getUserChatRooms] user object:',
        (client as any).user,
      );

      if (!userId) {
        this.logger.error(
          '❌ [getUserChatRooms] No userId found in client.user',
        );
        client.emit('getUserChatRoomsResponse', {
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const chatRooms = await this.chatService.getUserChatRooms(userId);
      this.logger.log(
        '🟢 [getUserChatRooms] chatRooms count:',
        chatRooms.length,
      );
      this.logger.log('🟢 [getUserChatRooms] chatRooms:', chatRooms);

      const response = {
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
      };

      this.logger.log('🟢 [getUserChatRooms] response prepared:', response);

      // Since we can't get the callback from NestJS, let's emit a custom event
      // The client can listen for this event instead of using ACK
      client.emit('getUserChatRoomsResponse', response);
      this.logger.log(
        '✅ [getUserChatRooms] Response emitted via custom event',
      );
    } catch (e: any) {
      this.logger.error(`❌ [getUserChatRooms] Error: ${e.message}`);
      this.logger.error(`❌ [getUserChatRooms] Stack: ${e.stack}`);

      // Emit error response
      client.emit('getUserChatRoomsResponse', {
        success: false,
        error: e.message,
      });
    }
  }

  // -------- Utilities --------
  getConnectedUserCount(): number {
    return this.connectedUsers.size;
  }
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
  getUserSocket(userId: string): Socket | undefined {
    return this.connectedUsers.get(userId);
  }
}
