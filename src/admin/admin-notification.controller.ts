import { Body, Controller, Post, Param, Get, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiBody } from '@nestjs/swagger';
import { NotificationProducer } from '../notifications/notification.producer';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationLog } from '../notifications/notification-logs/schemas/notification-log.schema';
import { RedisQueueService } from '../notifications/queue/redis-queue.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';
import { AdminSendNotificationDto } from '../notifications/dto/admin-send-notification.dto';

@ApiTags('Admin Notifications')
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminNotificationController {
    constructor(
        private readonly notificationProducer: NotificationProducer,
        private readonly queue: RedisQueueService,
        @InjectModel(NotificationLog.name)
        private readonly logModel: Model<NotificationLog>,
    ) { }

    @Post('send')
    @ApiOperation({
        summary: 'Send push notification (Queued)',
        description: 'Sends a push notification to specific users or all users. The notification is queued in Redis for background processing.'
    })
    @ApiBody({
        type: AdminSendNotificationDto,
        examples: {
            singleUser: {
                summary: 'Send to Single User',
                value: {
                    targetType: 'USER',
                    userIds: ['68b43b35bb6ed35ba4cf1bdf'],
                    title: 'Personal Message',
                    message: 'Hello User!',
                    data: { deepLink: 'profile' }
                }
            },
            multipleUsers: {
                summary: 'Send to Multiple Users',
                value: {
                    targetType: 'USERS',
                    userIds: ['68b43b35bb6ed35ba4cf1bdf1', '68b43b35bb6ed35ba4cf1bdf2'],
                    title: 'Group Announcement',
                    message: 'Hello everyone!',
                    data: { eventId: '101' }
                }
            },
            broadcast: {
                summary: 'Broadcast to ALL',
                value: {
                    targetType: 'ALL',
                    title: 'System Maintenance',
                    message: 'The system will be down tonight.',
                    data: { maintenance: 'true' }
                }
            }
        }
    })
    @ApiResponse({ status: 201, description: 'Notification queued successfully', type: NotificationLog })
    async send(@Body() body: AdminSendNotificationDto) {
        const { targetType, userIds, title, message, data } = body;

        return this.notificationProducer.createAndQueue({
            title,
            body: message,
            targetType,
            userIds,
            data,
        });
    }

    @Post('resend/:id')
    @ApiOperation({ summary: 'Resend a failed notification' })
    async resend(@Param('id') id: string) {
        const log = await this.logModel.findById(id);
        if (!log || log.status !== 'FAILED') {
            throw new BadRequestException('Notification not in FAILED status');
        }

        log.status = 'PENDING';
        await log.save();

        await this.queue.push({ logId: log._id });

        return { message: 'Notification re-queued' };
    }

    @Get('logs')
    @ApiOperation({ summary: 'Get notification logs' })
    async list() {
        return this.logModel.find().sort({ createdAt: -1 }).limit(100);
    }
}
