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
        let response: any;

        try {
            if ('tokens' in message) {
                // Handle multicast
                response = await this.firebaseService.getMessaging().sendEachForMulticast(message as admin.messaging.MulticastMessage);
            } else {
                // Handle single message (token, topic, or condition)
                response = await this.firebaseService.getMessaging().send(message as admin.messaging.Message);
            }

            this.logger.log(`Notification sent successfully: ${JSON.stringify(response)}`);

            await this.notificationRepository.createLog(dto.title, dto.body, dto, response);
            return response;
        } catch (error) {
            this.logger.error(`Notification failed: ${error.message}`);
            // Log the error to the database as well
            await this.notificationRepository.createLog(dto.title, dto.body, dto, { error: error.message });
            throw error;
        }
    }

    private transformToFcmV1(dto: BroadcastNotificationDto): admin.messaging.Message | admin.messaging.MulticastMessage {
        const { title, body, targetType, topic, tokens, media, data, priority } = dto;

        const baseMessage = {
            notification: {
                title,
                body,
                ...(media?.type === 'IMAGE' && media.url ? { image: media.url } : {}),
            },
            data: {
                ...this.formatData(data || {}), // Generic formatting for all data fields
                ...(data?.extra && { extra: JSON.stringify(data.extra) }), // Ensure extra is stringified
                ...(media?.type && { mediaType: media.type }),
                ...(media?.url && { mediaUrl: media.url }),
            },
            android: {
                priority: (priority === NotificationPriority.HIGH ? 'high' : 'normal') as 'high' | 'normal',
                notification: {
                    sound: 'default',
                    priority: (priority === NotificationPriority.HIGH ? 'high' : 'default') as 'high' | 'default',
                }
            },
            apns: {
                headers: {
                    'apns-priority': priority === NotificationPriority.HIGH ? '10' : '5',
                },
                payload: {
                    aps: {
                        sound: 'default',
                    },
                },
            },
        };

        // Set target
        if (targetType === TargetType.ALL) {
            return {
                ...baseMessage,
                topic: 'all_users',
            } as admin.messaging.TopicMessage;
        } else if (targetType === TargetType.TOPIC && topic) {
            return {
                ...baseMessage,
                topic: topic,
            } as admin.messaging.TopicMessage;
        } else if (targetType === TargetType.TOKENS && tokens?.length) {
            if (tokens.length === 1) {
                return {
                    ...baseMessage,
                    token: tokens[0],
                } as admin.messaging.TokenMessage;
            } else {
                return {
                    ...baseMessage,
                    tokens: tokens,
                } as admin.messaging.MulticastMessage;
            }
        }

        // Default fallback (though API should prevent this)
        return {
            ...baseMessage,
            topic: 'all_users',
        } as admin.messaging.TopicMessage;
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

        for (const [key, value] of Object.entries(data)) {
            if (value === null || value === undefined) continue;
            formatted[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
        return formatted;
    }
}
