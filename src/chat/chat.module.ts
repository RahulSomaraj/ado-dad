import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ContentModerationService } from './services/content-moderation.service';
import { ChatRoom, ChatRoomSchema } from './schemas/chat-room.schema';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';
import { Ad, AdSchema } from '../ads/schemas/ad.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadModule } from '../shared/upload.module';
import { ChatMessagingService } from './chat-messaging.service';
import { ChatUploadService } from './chat-upload.service';
import { ChatEventsService } from './realtime/chat-events.service';
import { ChatNotifierService } from './realtime/chat-notifier.service';
import { ChatSocketAuthService } from './realtime/chat-socket-auth.service';
import { ChatRateLimiterService } from './realtime/chat-rate-limiter.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatRoom.name, schema: ChatRoomSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: Ad.name, schema: AdSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
    UploadModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatGateway,
    ChatService,
    ChatMessagingService,
    ChatUploadService,
    ChatEventsService,
    ChatNotifierService,
    ChatSocketAuthService,
    ChatRateLimiterService,
    ContentModerationService,
  ],
  exports: [ChatService, ChatMessagingService, ContentModerationService],
})
export class ChatModule {}
