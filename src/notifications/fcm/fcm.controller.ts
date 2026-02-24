import { Body, Controller, Post, Req, UseGuards, Logger, BadRequestException } from '@nestjs/common';
import { FcmTokenService } from './fcm-token.service';
import { FcmNotificationService } from './fcm-notification.service';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth-guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { RegisterFcmTokenDto } from './dto/register-fcm-token.dto';
import { FcmResponseDto } from './dto/fcm-response.dto';

@ApiTags('FCM Notifications')
@Controller('fcm')
export class FcmController {
    private readonly logger = new Logger(FcmController.name);

    constructor(
        private readonly fcmTokenService: FcmTokenService,
        private readonly fcmNotificationService: FcmNotificationService,
    ) { }

    @Post('register-token')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Register FCM token for the current user',
        description: 'Associates a device FCM token with the authenticated user and subscribes to the broadcast topic.',
    })
    @ApiBody({
        type: RegisterFcmTokenDto,
        examples: {
            example1: {
                summary: 'Standard registration',
                value: {
                    token: 'dE1xX0..._z_Y',
                    userId: '68b43b35bb6ed35ba4cf1bdf',
                    platform: 'android',
                    deviceId: 'device_123'
                }
            }
        }
    })
    async register(
        @Req() req,
        @Body() registerFcmTokenDto: RegisterFcmTokenDto,
    ): Promise<FcmResponseDto> {
        try {
            const userId = registerFcmTokenDto.userId || req.user?.id;
            if (!userId) {
                throw new BadRequestException('User ID not found');
            }

            await this.fcmTokenService.registerToken(
                userId,
                registerFcmTokenDto.token,
                registerFcmTokenDto.platform,
                registerFcmTokenDto.deviceId,
            );
            this.logger.log(`FCM token registered successfully for user: ${userId}`);
            return {
                success: true,
                message: 'Token registered successfully',
            };
        } catch (error) {
            this.logger.error(
                `Failed to register FCM token for user: ${req.user?.id}`,
                error.stack,
            );
            throw new BadRequestException('Failed to register FCM token');
        }
    }

    @Post('test-push')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Send a test push notification to the current user',
    })
    async testPush(@Req() req): Promise<FcmResponseDto> {
        try {
            await this.fcmNotificationService.sendToUser(
                req.user.id,
                'Test Push 🚀',
                'FCM push notification is working',
                {
                    type: 'TEST',
                    timestamp: new Date().toISOString(),
                },
            );
            return {
                success: true,
                message: 'Test push notification sent successfully',
            };
        } catch (error) {
            this.logger.error(`Failed to send test push: ${error.message}`);
            throw new BadRequestException('Failed to send test push');
        }
    }
}
