import { Controller, Post, Body, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiBody } from '@nestjs/swagger';
import { FcmNotificationService } from './fcm/fcm-notification.service';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { GetNotificationsDto } from './dto/get-notifications.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';

@ApiTags('FCM Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
    constructor(private readonly fcmNotificationService: FcmNotificationService) { }

    @Post('send')
    @ApiOperation({
        summary: 'Send push notification',
        description: 'Sends a push notification based on target configuration. Supports ALL, TOPIC, and TOKENS targets with media and action support.'
    })
    @ApiBody({
        type: BroadcastNotificationDto,
        examples: {
            imageNotification: {
                summary: 'Image Notification',
                value: {
                    title: 'Flash Sale 🔥',
                    body: 'Flat 45% OFF today only!',
                    targetType: 'ALL',
                    priority: 'HIGH',
                    media: {
                        type: 'IMAGE',
                        url: 'https://azureblob.com/sale.jpg'
                    },
                    data: {
                        type: 'sale',
                        screen: 'offer_details',
                        entityId: '99'
                    }
                }
            },
            videoNotification: {
                summary: 'Video Notification',
                value: {
                    title: '🎥 Watch Our Resort Tour',
                    body: 'Tap to watch the full video!',
                    targetType: 'ALL',
                    priority: 'HIGH',
                    media: {
                        type: 'VIDEO',
                        url: 'https://azureblob.com/resort-tour.mp4'
                    },
                    data: {
                        type: 'video',
                        screen: 'video_player',
                        entityId: 'tour-123'
                    }
                }
            },
            basicNotification: {
                summary: 'Basic Notification (Title & Body Only)',
                value: {
                    title: 'App Update Available',
                    body: 'Please update to the latest version for better performance.',
                    targetType: 'ALL',
                    priority: 'NORMAL',
                    data: {
                        type: 'system',
                        screen: 'home'
                    }
                }
            },
            minimalNotification: {
                summary: 'Minimal Notification (Only Required Fields)',
                value: {
                    title: 'Hello World',
                    body: 'This is a broadcast message'
                }
            }
        }
    })
    @ApiResponse({ status: 201, description: 'Notification sent successfully' })
    async send(@Body() dto: BroadcastNotificationDto) {
        const messageId = await this.fcmNotificationService.sendBroadcast(dto);
        return {
            success: true,
            messageId
        };
    }

    @Get()
    @ApiOperation({
        summary: 'Get all broadcast notifications',
        description: 'Retrieves the history of all broadcast notifications sent.'
    })
    @ApiResponse({ status: 200, description: 'List of notifications' })
    async getAll(@Query() query: GetNotificationsDto) {
        return this.fcmNotificationService.getAllNotifications(query.page, query.limit, { _id: query._id });
    }
}
