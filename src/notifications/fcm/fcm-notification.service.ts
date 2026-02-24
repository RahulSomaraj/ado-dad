import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { PushNotificationRepository } from './repositories/push-notification.repository';
import { FcmTokenService } from './fcm-token.service';
import { BroadcastNotificationDto, NotificationPriority, TargetType } from '../dto/broadcast-notification.dto';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmNotificationService {
    private readonly logger = new Logger(FcmNotificationService.name);

    constructor(
        private readonly firebaseService: FirebaseService,
        private readonly notificationRepository: PushNotificationRepository,
        private readonly tokenService: FcmTokenService,
    ) { }

    async sendBroadcast(dto: BroadcastNotificationDto) {
        // Apply defaults
        const targetType = dto.targetType ?? TargetType.ALL;
        const priority = dto.priority ?? NotificationPriority.NORMAL;

        const message = this.transformToFcmV1({ ...dto, targetType, priority });
        let response: string;

        try {
            if ('topic' in message) {
                response = await this.firebaseService.getMessaging().send(message as admin.messaging.TopicMessage);
            } else if ('token' in message) {
                response = await this.firebaseService.getMessaging().send(message as admin.messaging.TokenMessage);
            } else if ('condition' in message) {
                response = await this.firebaseService.getMessaging().send(message as admin.messaging.ConditionMessage);
            } else {
                throw new Error('Unsupported target type for send()');
            }
            this.logger.log(`Notification sent successfully: ${response}`);
        } catch (error) {
            this.logger.error(`Notification failed: ${error.message}`);
            await this.notificationRepository.createLog(dto.title, dto.body, dto, { error: error.message });
            throw error;
        }

        await this.notificationRepository.createLog(dto.title, dto.body, dto, response);
        return response;
    }

    private transformToFcmV1(dto: BroadcastNotificationDto): admin.messaging.Message {
        const { title, body, targetType, topic, tokens, media, data, priority } = dto;

        const message: any = {
            notification: {
                title,
                body,
            },
            data: {
                ...(data?.type && { type: data.type }),
                ...(data?.screen && { screen: data.screen }),
                ...(data?.entityId && { entityId: data.entityId }),
                ...(media?.type && { mediaType: media.type }),
                ...(media?.url && { mediaUrl: media.url }),
                ...(data?.extra && { extra: JSON.stringify(data.extra) }),
                ...this.formatData(data || {}), // Include any additional data fields
            },
            android: {
                priority: priority === NotificationPriority.HIGH ? 'high' : 'normal',
            },
            apns: {
                headers: {
                    'apns-priority': priority === NotificationPriority.HIGH ? '10' : '5',
                },
            },
        };

        // Add image to notification if media is IMAGE
        if (media?.type === 'IMAGE' && media.url) {
            message.notification.image = media.url;
        }

        // Set target
        if (targetType === TargetType.ALL) {
            message.topic = 'all_users';
        } else if (targetType === TargetType.TOPIC && topic) {
            message.topic = topic;
        } else if (targetType === TargetType.TOKENS && tokens?.length) {
            if (tokens.length === 1) {
                message.token = tokens[0];
            } else {
                // Return original message for internal use or handle multicast separately
                message.tokens = tokens;
            }
        }

        return message;
    }

    async sendToUser(userId: string, title: string, body: string, data: any = {}) {
        const tokens = await this.tokenService.getActiveTokens(userId);
        if (!tokens.length) {
            this.logger.warn(`No active tokens found for user ${userId}`);
            return;
        }

        const formattedData = this.formatData(data);

        try {
            const response = await this.firebaseService.getMessaging().sendEachForMulticast({
                notification: { title, body },
                data: formattedData,
                tokens: tokens.map(t => t.token),
            });

            // Handle invalid tokens
            response.responses.forEach((res, index) => {
                if (!res.success) {
                    this.logger.error(`FCM failed for token: ${res.error?.message}`);
                    this.tokenService.deactivateToken(tokens[index].token);
                }
            });

            this.logger.log(`FCM sent to user ${userId}: ${response.successCount} successful, ${response.failureCount} failed.`);
            return response;
        } catch (error) {
            this.logger.error(`Failed to send to user ${userId}: ${error.message}`);
            throw error;
        }
    }

    async getAllNotifications(page: number = 1, limit: number = 10, filters?: { _id?: string }) {
        const [data, total] = await this.notificationRepository.findAll(page, limit, filters);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
        };
    }

    /**
     * Format data payload for FCM (all values must be strings)
     */
    public formatData(data: Record<string, any>): Record<string, string> {
        if (!data) return {};
        const formatted: Record<string, string> = {};

        // Skip keys that are already handled explicitly or aren't strings
        const handledKeys = ['type', 'screen', 'entityId', 'extra'];

        for (const [key, value] of Object.entries(data)) {
            if (value === null || value === undefined || handledKeys.includes(key)) continue;
            formatted[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
        return formatted;
    }
}
