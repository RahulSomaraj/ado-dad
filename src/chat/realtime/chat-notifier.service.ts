import { Injectable, Logger } from '@nestjs/common';
import { NotificationProducer } from '../../notifications/notification.producer';
import { RedisService } from '../../shared/redis.service';
import { ChatEventsService } from './chat-events.service';

export interface NewMessagePush {
  roomId: string;
  recipientId: string;
  senderName: string;
  preview: string;
}

/** Push window per room+recipient: a burst of messages produces one notification. */
const COLLAPSE_SECONDS = 30;

@Injectable()
export class ChatNotifierService {
  private readonly logger = new Logger(ChatNotifierService.name);

  constructor(
    private readonly producer: NotificationProducer,
    private readonly redis: RedisService,
    private readonly events: ChatEventsService,
  ) {}

  /** Fire-and-forget: never throws, never delays the send path. */
  notifyNewMessage(push: NewMessagePush): void {
    this.deliver(push).catch((err) =>
      this.logger.warn(`Chat push skipped for room ${push.roomId}: ${(err as Error).message}`),
    );
  }

  private async deliver({ roomId, recipientId, senderName, preview }: NewMessagePush) {
    // Users with a live socket already get `conversation_updated` in-app.
    if (await this.events.isUserOnline(recipientId)) return;

    const collapseKey = `chat:push:${roomId}:${recipientId}`;
    try {
      if (await this.redis.exists(collapseKey)) return;
      await this.redis.set(collapseKey, '1', COLLAPSE_SECONDS);
    } catch {
      // Redis down: still send (worse case is duplicate pushes, not lost ones).
    }

    await this.producer.createAndQueue({
      title: senderName || 'New message',
      body: preview || 'You have a new message',
      targetType: 'USER',
      userIds: [recipientId],
      data: { type: 'chat', roomId },
    });
  }
}
