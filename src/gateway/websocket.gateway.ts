import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../chat/chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
  allowEIO3: true,
})
export class MyGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly chatService: ChatService) {}

  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('WebSocketGateway');
  private connectionCount: number = 0;

  afterInit(server: Server) {
    this.logger.log('🚀 ==========================================');
    this.logger.log('🚀 WebSocket Gateway initialized successfully');
    this.logger.log('🚀 Server listening on namespace: /');
    this.logger.log('🚀 CORS enabled for all origins');
    this.logger.log('🚀 Ready to accept incoming connections');
    this.logger.log('🚀 Transports: websocket, polling');
    this.logger.log('🚀 ==========================================');

    // Log server configuration
    this.logger.log(`📡 Server configuration:`);
    this.logger.log(`   - Namespace: /`);
    this.logger.log(`   - CORS Origin: *`);
    this.logger.log(`   - Transports: websocket, polling`);
    this.logger.log(`   - Allow EIO3: true`);
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.connectionCount++;
    const timestamp = new Date().toISOString();

    this.logger.log('🔌 ==========================================');
    this.logger.log(`🔌 NEW SOCKET CONNECTION RECEIVED!`);
    this.logger.log(`🔌 Client ID: ${client.id}`);
    this.logger.log(`🔌 Client IP: ${client.handshake.address}`);
    this.logger.log(`🔌 User Agent: ${client.handshake.headers['user-agent']}`);
    this.logger.log(`🔌 Timestamp: ${timestamp}`);
    this.logger.log(`🔌 Total Active Connections: ${this.connectionCount}`);
    this.logger.log(`🔌 Transport: ${client.conn.transport.name}`);
    this.logger.log('🔌 ==========================================');

    // Log connection details
    this.logger.log(`📍 Connection Details:`);
    this.logger.log(
      `   - Protocol: ${client.handshake.headers['sec-websocket-protocol'] || 'default'}`,
    );
    this.logger.log(
      `   - Origin: ${client.handshake.headers.origin || 'unknown'}`,
    );
    this.logger.log(
      `   - Referer: ${client.handshake.headers.referer || 'unknown'}`,
    );

    // Send welcome message to client
    client.emit('connected', {
      message: 'Connected to WebSocket server',
      clientId: client.id,
      timestamp: timestamp,
      serverInfo: {
        name: 'Ado-Dad WebSocket Server',
        version: '1.0.0',
        totalConnections: this.connectionCount,
      },
    });

    this.logger.log(`✅ Welcome message sent to client ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.connectionCount = Math.max(0, this.connectionCount - 1);
    const timestamp = new Date().toISOString();

    this.logger.log('🔌 ==========================================');
    this.logger.log(`🔌 SOCKET DISCONNECTION DETECTED!`);
    this.logger.log(`🔌 Client ID: ${client.id}`);
    this.logger.log(`🔌 Client IP: ${client.handshake.address}`);
    this.logger.log(`🔌 Timestamp: ${timestamp}`);
    this.logger.log(`🔌 Remaining Active Connections: ${this.connectionCount}`);
    this.logger.log('🔌 ==========================================');
  }

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody('chatId') chatId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const timestamp = new Date().toISOString();
    this.logger.log('👥 ==========================================');
    this.logger.log(`👥 CHAT JOIN REQUEST RECEIVED!`);
    this.logger.log(`👥 Client ID: ${client.id}`);
    this.logger.log(`👥 Chat ID: ${chatId}`);
    this.logger.log(`👥 Timestamp: ${timestamp}`);
    this.logger.log('👥 ==========================================');

    client.join(chatId);
    client.emit('joinedChat', {
      chatId,
      message: 'Successfully joined chat',
      timestamp: timestamp,
      clientId: client.id,
    });

    this.logger.log(
      `✅ Client ${client.id} successfully joined chat ${chatId}`,
    );
  }

  @SubscribeMessage('leaveChat')
  async handleLeaveChat(
    @MessageBody('chatId') chatId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const timestamp = new Date().toISOString();
    this.logger.log('👋 ==========================================');
    this.logger.log(`👋 CHAT LEAVE REQUEST RECEIVED!`);
    this.logger.log(`👋 Client ID: ${client.id}`);
    this.logger.log(`👋 Chat ID: ${chatId}`);
    this.logger.log(`👋 Timestamp: ${timestamp}`);
    this.logger.log('👋 ==========================================');

    client.leave(chatId);
    client.emit('leftChat', {
      chatId,
      message: 'Successfully left chat',
      timestamp: timestamp,
      clientId: client.id,
    });

    this.logger.log(`✅ Client ${client.id} successfully left chat ${chatId}`);
  }

  @SubscribeMessage('message')
  async handleMessage(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    this.logger.log('💬 ==========================================');
    this.logger.log(`💬 NEW MESSAGE RECEIVED!`);
    this.logger.log(`💬 Client ID: ${client.id}`);
    this.logger.log(`💬 Payload: ${JSON.stringify(payload, null, 2)}`);
    this.logger.log(`💬 Timestamp: ${timestamp}`);
    this.logger.log('💬 ==========================================');

    try {
      // Extract chatId, content, and senderId
      const { chatId, content } = payload;
      const senderId = payload.senderId || client.handshake.auth.userId;

      if (!chatId || !content) {
        this.logger.error('❌ ==========================================');
        this.logger.error(`❌ INVALID MESSAGE PAYLOAD!`);
        this.logger.error(`❌ Missing chatId or content`);
        this.logger.error(`❌ Client ID: ${client.id}`);
        this.logger.error(`❌ Payload: ${JSON.stringify(payload)}`);
        this.logger.error('❌ ==========================================');

        client.emit('error', {
          message: 'Missing chatId or content',
          timestamp: timestamp,
          clientId: client.id,
        });
        return;
      }

      // Save the message in the database
      const savedMessage = await this.chatService.sendMessage(
        chatId,
        senderId,
        content,
      );

      this.logger.log(`✅ ==========================================`);
      this.logger.log(`✅ MESSAGE SAVED SUCCESSFULLY!`);
      this.logger.log(`✅ Message ID: ${savedMessage._id}`);
      this.logger.log(`✅ Chat ID: ${chatId}`);
      this.logger.log(`✅ Sender ID: ${senderId}`);
      this.logger.log(
        `✅ Content: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
      );
      this.logger.log(`✅ Timestamp: ${timestamp}`);
      this.logger.log(`✅ ==========================================`);

      // Broadcast the saved message to all clients in the chat room
      this.server.to(chatId).emit('message', savedMessage);

      // Send confirmation to sender
      client.emit('messageSent', {
        messageId: savedMessage._id,
        status: 'sent',
        timestamp: timestamp,
        clientId: client.id,
      });

      this.logger.log(`📢 Message broadcasted to chat room ${chatId}`);
    } catch (error) {
      this.logger.error('❌ ==========================================');
      this.logger.error(`❌ ERROR SAVING MESSAGE!`);
      this.logger.error(`❌ Client ID: ${client.id}`);
      this.logger.error(`❌ Error: ${error.message}`);
      this.logger.error(`❌ Stack: ${error.stack}`);
      this.logger.error(`❌ Timestamp: ${timestamp}`);
      this.logger.error('❌ ==========================================');

      client.emit('error', {
        message: 'Failed to save message',
        error: error.message,
        timestamp: timestamp,
        clientId: client.id,
      });
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    const timestamp = new Date().toISOString();
    this.logger.log(`🏓 PING received from ${client.id} at ${timestamp}`);
    client.emit('pong', {
      timestamp: timestamp,
      clientId: client.id,
      message: 'Pong response from server',
    });
    this.logger.log(`🏓 PONG sent to ${client.id}`);
  }

  @SubscribeMessage('getServerInfo')
  handleGetServerInfo(@ConnectedSocket() client: Socket) {
    const timestamp = new Date().toISOString();
    this.logger.log(`ℹ️ Server info requested by ${client.id} at ${timestamp}`);

    client.emit('serverInfo', {
      serverName: 'Ado-Dad WebSocket Server',
      version: '1.0.0',
      totalConnections: this.connectionCount,
      uptime: process.uptime(),
      timestamp: timestamp,
      clientId: client.id,
    });

    this.logger.log(`ℹ️ Server info sent to ${client.id}`);
  }
}
