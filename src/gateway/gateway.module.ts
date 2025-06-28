import { Module } from '@nestjs/common';
import { MyGateway } from './websocket.gateway';
import { ChatService } from '../chat/chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatMessage, ChatMessageSchema } from '../chat/schemas/chat.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
  ],
  providers: [MyGateway, ChatService],
  exports: [MyGateway],
})
export class GatewayModule {}
