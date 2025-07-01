import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';

@WebSocketGateway({ cors: true })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody('chat') chat: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(chat);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { chat: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Assume userId is available via client.handshake.auth or similar
    const userId = client.handshake.auth.userId;
    const message = await this.chatService.sendMessage(data.chat, userId, data.content);
    this.server.to(data.chat).emit('newMessage', message);
    return message;
  }
} 