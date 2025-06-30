import { Module } from '@nestjs/common';
import { MyGateway } from './websocket.gateway';
import { ChatService } from '../chat/chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Chat, ChatSchema } from '../chat/schemas/chat.schema';
import { Message, MessageSchema } from '../chat/schemas/message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Chat.name, schema: ChatSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  providers: [MyGateway, ChatService],
  exports: [MyGateway],
})
export class GatewayModule {}
