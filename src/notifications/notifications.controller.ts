import { Controller, Post, Body, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiBody } from '@nestjs/swagger';
import { FcmService } from './fcm/fcm.service';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { GetNotificationsDto } from './dto/get-notifications.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
    constructor(private readonly fcmService: FcmService) { }

    @Post('send')
    @ApiOperation({
        summary: 'Send broadcast push notification',
        description: 'Sends a push notification to ALL users subscribed to "all_users" topic and stores the record.'
    })
    @ApiBody({ type: BroadcastNotificationDto })
    @ApiResponse({ status: 201, description: 'Notification sent successfully' })
    async send(@Body() dto: BroadcastNotificationDto) {
        return this.fcmService.sendToAllUsers(dto.title, dto.body, dto.data);
    }

    @Get()
    @ApiOperation({
        summary: 'Get all broadcast notifications',
        description: 'Retrieves the history of all broadcast notifications sent.'
    })
    @ApiResponse({ status: 200, description: 'List of notifications' })
    async getAll(@Query() query: GetNotificationsDto) {
        return this.fcmService.getAllNotifications(query.page, query.limit, { _id: query._id });
    }
}
