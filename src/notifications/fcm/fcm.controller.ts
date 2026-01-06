import { Body, Controller, Post, Req, UseGuards, Logger, BadRequestException, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FcmService } from './fcm.service';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth-guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { RegisterFcmTokenDto } from './dto/register-fcm-token.dto';
import { FcmResponseDto } from './dto/fcm-response.dto';

@ApiTags('FCM')
@Controller('fcm')
export class FcmController {
    private readonly logger = new Logger(FcmController.name);

    constructor(
        private readonly fcmService: FcmService,
        private readonly configService: ConfigService,
    ) { }

    @Get('config')
    @ApiOperation({ summary: 'Get public FCM configuration for frontend' })
    getPublicConfig() {
        const config = {
            apiKey: this.configService.get('FCM_CONFIG.API_KEY'),
            projectId: this.configService.get('FCM_CONFIG.PROJECT_ID'),
            messagingSenderId: this.configService.get('FCM_CONFIG.MESSAGING_SENDER_ID'),
            appId: this.configService.get('FCM_CONFIG.APP_ID'),
            vapidKey: this.configService.get('FCM_CONFIG.VAPID_KEY'),
        };

        // Log missing variables for easier debugging
        const missing = Object.entries(config)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missing.length > 0) {
            this.logger.warn(`Missing FCM config variables in .env: ${missing.join(', ')}`);
        } else {
            this.logger.log('FCM public configuration retrieved successfully');
        }

        return config;
    }

    @Post('register-token')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Register FCM token for the current user',
        description: 'Associates a device FCM token with the authenticated user for push notifications.',
    })
    @ApiBody({ type: RegisterFcmTokenDto })
    @ApiResponse({
        status: 201,
        description: 'Token registered successfully',
        type: FcmResponseDto,
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 400, description: 'Bad Request - Validation failed' })
    async register(
        @Req() req,
        @Body() registerFcmTokenDto: RegisterFcmTokenDto,
    ): Promise<FcmResponseDto> {
        try {
            await this.fcmService.registerToken(
                req.user.id,
                registerFcmTokenDto.token,
                registerFcmTokenDto.platform,
                registerFcmTokenDto.deviceId,
            );
            this.logger.log(`FCM token registered successfully for user: ${req.user.id}`);
            return {
                success: true,
                message: 'Token registered successfully',
            };
        } catch (error) {
            this.logger.error(
                `Failed to register FCM token for user: ${req.user.id}`,
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
        description: 'Triggers a test push notification to all active tokens of the authenticated user.',
    })
    @ApiResponse({
        status: 200,
        description: 'Test push triggered',
        type: FcmResponseDto,
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async testPush(@Req() req): Promise<FcmResponseDto> {
        try {
            await this.fcmService.sendToUser(
                req.user.id,
                'Test Push 🚀',
                'FCM push notification is working',
                {
                    type: 'TEST',
                    timestamp: new Date().toISOString(),
                },
            );
            this.logger.log(`Test push triggered for user: ${req.user.id}`);
            return {
                success: true,
                message: 'Test push notification sent successfully',
            };
        } catch (error) {
            this.logger.error(
                `Failed to send test push for user: ${req.user.id}`,
                error.stack,
            );
            throw new BadRequestException('Failed to send test push notification');
        }
    }

}
