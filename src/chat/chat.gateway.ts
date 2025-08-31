import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, Socket>();

  afterInit(server: Server) {
    this.logger.log('🚀 Chat Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`🔌 New connection attempt from client ${client.id}`);

      // For now, accept all connections without authentication
      const userId = `user_${client.id}`;
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
      const userId = `user_${client.id}`;
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
