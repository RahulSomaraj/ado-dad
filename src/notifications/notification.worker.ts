import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisQueueService } from './queue/redis-queue.service';
import { NotificationLog } from './notification-logs/schemas/notification-log.schema';
import { FcmService } from './fcm/fcm.service';

@Injectable()
export class NotificationWorker implements OnModuleInit {
    private readonly logger = new Logger(NotificationWorker.name);

    constructor(
        private readonly queue: RedisQueueService,
        private readonly fcmService: FcmService,
        @InjectModel(NotificationLog.name)
        private readonly logModel: Model<NotificationLog>,
    ) { }

    async onModuleInit() {
        // Start consumption in background
        this.consume().catch(err => this.logger.error('Worker consumption error', err));
    }

    async consume() {
        this.logger.log('Notification Worker started consuming...');
        while (true) {
            try {
                const job = await this.queue.pop();
                if (!job) {
                    // Backoff if not connected or queue empty
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue;
                }

                const log = await this.logModel.findById(job.logId);
                if (!log) continue;

                try {
                    if (log.targetType === 'USER' && log.userIds?.length) {
                        await this.fcmService.sendToUser(
                            log.userIds[0],
                            log.title,
                            log.body,
                            log.data,
                        );
                    } else if (log.targetType === 'USERS' && log.userIds?.length) {
                        await this.fcmService.sendToUsers(
                            log.userIds,
                            log.title,
                            log.body,
                            log.data,
                        );
                    } else if (log.targetType === 'ALL') {
                        await this.fcmService.sendToAll(
                            log.title,
                            log.body,
                            log.data,
                        );
                    }

                    log.status = 'SENT';
                    await log.save();
                } catch (err) {
                    this.logger.error(`Notification delivery failed for log ${log._id}: ${err.message}`);
                    log.status = 'FAILED';
                    log.retryCount += 1;
                    log.error = err.message;
                    await log.save();
                }
            } catch (err) {
                if (err.message === 'The client is closed' || err.name === 'ClientClosedError') {
                    this.logger.warn('Redis client is unavailable, retrying in 5s...');
                } else {
                    this.logger.error(`Worker job processing error: ${err.message}`);
                }
                // Backoff on error to prevent tight loop spam
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }
}
