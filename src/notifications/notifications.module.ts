import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationLog, NotificationLogSchema } from './notification-logs/schemas/notification-log.schema';
import { FcmModule } from './fcm/fcm.module';
import { RedisQueueService } from './queue/redis-queue.service';
import { NotificationProducer } from './notification.producer';
import { NotificationWorker } from './notification.worker';
import { RedisModule } from '../shared/redis.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: NotificationLog.name, schema: NotificationLogSchema },
        ]),
        FcmModule,
        RedisModule,
    ],
    providers: [
        RedisQueueService,
        NotificationProducer,
        NotificationWorker,
    ],
    exports: [NotificationProducer, FcmModule, RedisQueueService, MongooseModule],
})
export class NotificationsModule { }
