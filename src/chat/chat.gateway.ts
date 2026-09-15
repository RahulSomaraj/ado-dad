import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import type { Namespace, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MarkReadSocketDto } from './dto/chat-query.dto';
import { ChatError, ChatErrorCode, toAckError } from './chat-errors';
import { ChatEvents, ChatEventsService, userChannel } from './realtime/chat-events.service';
import { ChatSocketAuthService, SocketUser } from './realtime/chat-socket-auth.service';
import { ChatRateLimiterService } from './realtime/chat-rate-limiter.service';
import { ChatWsExceptionFilter } from './realtime/chat-ws-exception.filter';
import { ChatMessagingService } from './chat-messaging.service';

function gatewayCorsOrigins(): string[] | string {
  const list = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return list.length ? list : '*';
}

/**
 * Socket.IO `/chat` namespace.
 *
 * - Auth happens once at handshake (ChatSocketAuthService). Each event only checks the
 *   cached token expiry; on expiry the server emits `auth_error {code}` and disconnects so
 *   the app refreshes its token and reconnects (a silent dead socket was F-02).
 * - Every handler RETURNS its ack. Errors become `{success:false, code, error}` acks.
 * - Legacy `*Response` events are still emitted for store builds.
 */
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: gatewayCorsOrigins(), methods: ['GET', 'POST'], credentials: true },
  transports: ['websocket', 'polling'],
})
@UseFilters(new ChatWsExceptionFilter())
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) =>
      new WsException({
        code: ChatErrorCode.VALIDATION,
        message: errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('; ') || 'Invalid payload',
      }),
  }),
)
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server: Namespace;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly messaging: ChatMessagingService,
    private readonly events: ChatEventsService,
    private readonly socketAuth: ChatSocketAuthService,
    private readonly rateLimiter: ChatRateLimiterService,
  ) {}

  afterInit(server: Namespace) {
    this.events.attach(server);
    this.logger.log('Chat gateway ready');
  }

  async handleConnection(client: Socket) {
    try {
      const result = await this.socketAuth.authenticate(client);
      if (!result.ok) {
        client.emit(ChatEvents.AUTH_ERROR, { code: result.code });
        client.disconnect(true);
        return;
      }
      client.data.user = result.user;
      await client.join(userChannel(result.user.id));
      client.emit(ChatEvents.CONNECTED, {
        success: true,
        userId: result.user.id,
        socketId: client.id,
        message: 'Successfully connected to chat server',
      });
    } catch (e) {
      this.logger.error(`Connection error: ${(e as Error).message}`);
      client.emit(ChatEvents.AUTH_ERROR, { code: ChatErrorCode.UNAUTHORIZED });
      client.disconnect(true);
    }
  }

  /** Authenticated user for this socket, or emits auth_error + disconnects and throws. */
  private requireUser(client: Socket): SocketUser {
    const user: SocketUser | undefined = client.data?.user;
    if (!user) {
      client.emit(ChatEvents.AUTH_ERROR, { code: ChatErrorCode.UNAUTHORIZED });
      client.disconnect(true);
      throw new ChatError(ChatErrorCode.UNAUTHORIZED, 'Not authenticated');
    }
    if (this.socketAuth.isExpired(user)) {
      client.emit(ChatEvents.AUTH_ERROR, { code: ChatErrorCode.TOKEN_EXPIRED });
      // Let the ack flush before dropping the connection.
      setTimeout(() => client.disconnect(true), 50);
      throw new ChatError(ChatErrorCode.TOKEN_EXPIRED, 'Session expired');
    }
    return user;
  }

  private fail(e: unknown) {
    const ack = toAckError(e);
    if (ack.code === ChatErrorCode.INTERNAL) {
      this.logger.error((e as Error)?.stack ?? String(e));
    }
    return ack;
  }

  // ---------- PING ----------
  @SubscribeMessage('ping')
  handlePing(@MessageBody() payload: { t0?: number }) {
    return { ok: true, t0: payload?.t0, ts: Date.now() };
  }

  // ---------- SEND MESSAGE ----------
  @SubscribeMessage('sendMessage')
  async handleSendMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: SendMessageDto) {
    try {
      const user = this.requireUser(client);
      await this.rateLimiter.consume('sendMessage', user.id);
      const { roomId, ...body } = payload;
      const message = await this.messaging.send(roomId, user.id, body);
      const response = { success: true, message };
      client.emit('sendMessageResponse', response); // legacy
      return response;
    } catch (e) {
      return this.fail(e);
    }
  }

  // ---------- CREATE CHAT ROOM ----------
  @SubscribeMessage('createChatRoom')
  async handleCreateChatRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: CreateChatRoomDto) {
    try {
      const user = this.requireUser(client);
      await this.rateLimiter.consume('createRoom', user.id);
      const room = await this.chatService.createChatRoom(user.id, payload.adId);
      await client.join(room.roomId);
      const view = await this.chatService.getRoomView(room.roomId, user.id);
      const response = { success: true, data: view, message: 'Chat room created successfully' };
      client.emit('chatRoomCreated', response); // legacy (was broadcast to the room)
      return response;
    } catch (e) {
      return this.fail(e);
    }
  }

  // ---------- JOIN CHAT ROOM ----------
  @SubscribeMessage('joinChatRoom')
  async handleJoinChatRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinRoomDto) {
    let response: Record<string, any>;
    try {
      const user = this.requireUser(client);
      const room = await this.chatService.getRoomForParticipant(payload.roomId, user.id);
      await client.join(room.roomId);
      response = {
        success: true,
        roomId: room.roomId,
        userRole: this.chatService.isParticipant(room, user.id)
          ? String(room.initiatorId) === user.id
            ? 'initiator'
            : 'receiver'
          : null,
        message: `Successfully joined chat room: ${room.roomId}`,
      };
      client.to(room.roomId).emit('userJoinedRoom', {
        userId: user.id,
        roomId: room.roomId,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      response = this.fail(e);
    }
    client.emit('joinChatRoomResponse', response); // legacy
    return response;
  }

  // ---------- LEAVE CHAT ROOM ----------
  @SubscribeMessage('leaveChatRoom')
  async handleLeaveChatRoom(@ConnectedSocket() client: Socket, @MessageBody() data: JoinRoomDto) {
    try {
      const user = this.requireUser(client);
      await client.leave(data.roomId);
      client.to(data.roomId).emit('userLeftRoom', {
        userId: user.id,
        roomId: data.roomId,
        timestamp: new Date().toISOString(),
      });
      return { success: true, roomId: data.roomId };
    } catch (e) {
      return this.fail(e);
    }
  }

  // ---------- MARK READ ----------
  @SubscribeMessage('markChatRoomRead')
  async handleMarkRead(@ConnectedSocket() client: Socket, @MessageBody() payload: MarkReadSocketDto) {
    try {
      const user = this.requireUser(client);
      await this.rateLimiter.consume('markRead', user.id);
      const result = await this.messaging.markRead(payload.roomId, user.id, payload.lastMessageId);
      const response = { success: true, ...result };
      client.emit('markChatRoomReadResponse', response);
      return response;
    } catch (e) {
      return this.fail(e);
    }
  }

  // ---------- CHECK EXISTING CHAT ROOM (legacy) ----------
  @SubscribeMessage('checkExistingChatRoom')
  async handleCheckExistingChatRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { adId: string; otherUserId?: string },
  ) {
    try {
      const user = this.requireUser(client);
      let otherUserId = payload?.otherUserId;
      if (!otherUserId) {
        const ad = await this.chatService.getAdById(payload?.adId);
        if (!ad) return { success: false, code: ChatErrorCode.AD_NOT_FOUND, error: 'Ad not found' };
        otherUserId = String(ad.postedBy);
      }
      const room = await this.chatService.findExistingChatRoom(user.id, payload.adId, otherUserId);
      return { success: true, exists: !!room, room: room ? { roomId: room.roomId, status: room.status } : null };
    } catch (e) {
      return this.fail(e);
    }
  }

  // ---------- GET ROOM MESSAGES (legacy socket path) ----------
  @SubscribeMessage('getRoomMessages')
  async handleGetRoomMessages(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinRoomDto) {
    let response: Record<string, any>;
    try {
      const user = this.requireUser(client);
      const result = await this.chatService.getRoomMessages(payload.roomId, user.id, { limit: 50 });
      // `data` mirrors `messages` for the old client parser.
      response = { success: true, roomId: payload.roomId, ...result, data: result.messages };
    } catch (e) {
      response = this.fail(e);
    }
    client.emit('getRoomMessagesResponse', response);
    return response;
  }

  // ---------- GET USER CHAT ROOMS (legacy socket path) ----------
  @SubscribeMessage('getUserChatRooms')
  async handleGetUserChatRooms(@ConnectedSocket() client: Socket) {
    let response: Record<string, any>;
    try {
      const user = this.requireUser(client);
      const rooms = await this.chatService.getUserChatRooms(user.id);
      response = { success: true, chatRooms: rooms, data: rooms };
    } catch (e) {
      response = this.fail(e);
    }
    client.emit('getUserChatRoomsResponse', response);
    return response;
  }
}
