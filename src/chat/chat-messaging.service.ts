import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatService } from './chat.service';
import { SendMessageBodyDto } from './dto/send-message.dto';
import { ChatEvents, ChatEventsService } from './realtime/chat-events.service';
import { ChatNotifierService } from './realtime/chat-notifier.service';
import { User } from '../users/schemas/user.schema';

/**
 * The single write path for chat, shared by REST and Socket.IO:
 * persist → broadcast to the room → update both users' conversation rows → push.
 */
@Injectable()
export class ChatMessagingService {
  private readonly logger = new Logger(ChatMessagingService.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly events: ChatEventsService,
    private readonly notifier: ChatNotifierService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async send(roomId: string, senderId: string, body: SendMessageBodyDto): Promise<Record<string, any>> {
    const { message, room, recipientId, created } = await this.chatService.sendMessage(roomId, senderId, body);
    if (!created) return message; // idempotent replay: already broadcast the first time

    this.events.toRoom(room.roomId, ChatEvents.MESSAGE, message);
    void this.fanOutConversation(room.roomId, [senderId, recipientId]);

    if (recipientId !== String(senderId)) {
      const sender = await this.userModel.findById(senderId).select('name').lean<{ name?: string }>().exec();
      this.notifier.notifyNewMessage({
        roomId: room.roomId,
        recipientId,
        senderName: sender?.name ?? 'New message',
        preview: ChatService.previewFor(message.type, message.content),
      });
    }
    return message;
  }

  async markRead(roomId: string, userId: string, lastMessageId?: string) {
    const { room, lastReadAt, otherUserId } = await this.chatService.markRoomRead(roomId, userId, lastMessageId);
    this.events.toRoom(room.roomId, ChatEvents.MESSAGES_READ, {
      roomId: room.roomId,
      userId,
      lastReadAt,
      lastMessageId: lastMessageId ?? null,
    });
    void this.fanOutConversation(room.roomId, [userId]);
    return { roomId: room.roomId, unreadCount: 0, lastReadAt, otherUserId };
  }

  /** Push each user's own view of the room (unread count and role differ per user). */
  async fanOutConversation(roomId: string, userIds: string[]): Promise<void> {
    const unique = [...new Set(userIds.map(String))];
    await Promise.all(
      unique.map(async (uid) => {
        try {
          const view = await this.chatService.getRoomView(roomId, uid);
          this.events.toUser(uid, ChatEvents.CONVERSATION_UPDATED, view);
        } catch (err) {
          this.logger.warn(`conversation_updated skipped for ${uid}: ${(err as Error).message}`);
        }
      }),
    );
  }
}
