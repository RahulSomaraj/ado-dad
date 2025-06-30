import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../chat/chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class MyGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly chatService: ChatService) {}

  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('MyGateway');

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    console.log('afterInit called, server:', server);
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    // Additional actions on client connection can be performed here.
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Additional actions on client disconnect can be performed here.
  }

  // @SubscribeMessage('message')
  // handleMessage(@MessageBody() payload: any): void {
  //   this.logger.log(`Message received: ${payload}`);
  //   // Broadcast the message to all connected clients
  //   this.server.emit('message', payload);
  // }

  @SubscribeMessage('message')
  async handleMessage(@MessageBody() payload: any, client: Socket): Promise<void> {
    this.logger.log(`Message received: ${JSON.stringify(payload)}`);
    try {
      // Extract chatId, content, and senderId
      const { chatId, content } = payload;
      const senderId = payload.senderId || client.handshake.auth.userId;
      // Save the message in the database
      const savedMessage = await this.chatService.sendMessage(chatId, senderId, content);
      // Broadcast the saved message to all connected clients
      this.server.emit('message', savedMessage);
    } catch (error) {
      this.logger.error('Error saving chat message', error);
      // Optionally, you can emit an error event back to the client here
    }
  }
}
