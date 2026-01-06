import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationLog } from './notification-logs/schemas/notification-log.schema';
import { RedisQueueService } from './queue/redis-queue.service';

@Injectable()
export class NotificationProducer {
    private readonly logger = new Logger(NotificationProducer.name);

    constructor(
        @InjectModel(NotificationLog.name)
        private readonly logModel: Model<NotificationLog>,
        private readonly queue: RedisQueueService,
    ) { }

    async createAndQueue(payload: Partial<NotificationLog>) {
        const log = await this.logModel.create(payload);

        try {
            await this.queue.push({
                logId: log._id,
            });
        } catch (err) {
            // Mark as FAILED if queuing fails (e.g. Redis down)
            log.status = 'FAILED';
            log.error = `Queuing failed: ${err.message}`;
            await log.save();
        }

        return log;
    }
}
