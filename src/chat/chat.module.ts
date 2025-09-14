import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ContentModerationService } from './services/content-moderation.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { ChatRoom, ChatRoomSchema } from './schemas/chat-room.schema';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';
import { Ad, AdSchema } from '../ads/schemas/ad.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatRoom.name, schema: ChatRoomSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: Ad.name, schema: AdSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ChatController],
  providers: [
    ChatGateway,
    ChatService,
    ContentModerationService,
    RateLimitGuard,
  ],
  exports: [ChatGateway, ChatService, ContentModerationService],
})
export class ChatModule {}
