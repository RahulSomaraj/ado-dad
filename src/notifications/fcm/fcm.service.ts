import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FcmTokenRepository } from './repositories/fcm-token.repo';
import { PushNotification } from './schemas/push-notification.schema';

@Injectable()
export class FcmService {
    private readonly logger = new Logger(FcmService.name);

    constructor(
        @Inject('FIREBASE_ADMIN') private readonly firebase: any,
        private readonly tokenRepo: FcmTokenRepository,
        private readonly configService: ConfigService,
        @InjectModel(PushNotification.name) private pushNotificationModel: Model<PushNotification>,
    ) { }
    /**
     * Register a new FCM token for a user
     * @param userId - The ID of the user
     * @param token - The FCM token to register
     * @param platform - The platform of the device (e.g. 'android' or 'ios')
     * @param deviceId - The ID of the device (optional)
     * @returns The registered token
     */
    async registerToken(userId: string, token: string, platform: string, deviceId?: string) {
        // Subscribe to "all_users" topic for global broadcasts
        try {
            await this.firebase.messaging().subscribeToTopic(token, 'all_users');
            this.logger.debug(`Token ${token.substring(0, 10)}... subscribed to 'all_users' topic`);
        } catch (error) {
            this.logger.error(`Failed to subscribe token to 'all_users' topic: ${error.message}`);
        }
        return this.tokenRepo.upsert(userId, token, platform, deviceId);
    }
    /**
    * Send a push notification to a specific user
    * @param userId - The ID of the user
    * @param title - The title of the notification
    * @param body - The body of the notification
    * @param data - The data to be sent with the notification (optional)
    * @returns The response from the FCM server
    */
    async sendToUser(
        userId: string,
        title: string,
        body: string,
        data: any = {},
    ) {
        const tokens = await this.tokenRepo.findActiveByUser(userId);
        if (!tokens.length) return;

        const formattedData = this.formatFcmData(data);

        const response = await this.firebase.messaging().sendEachForMulticast({
            notification: { title, body },
            data: formattedData,
            tokens: tokens.map(t => t.token),
        });

        // handle invalid tokens
        response.responses.forEach((res, index) => {
            if (!res.success) {
                this.logger.error(`FCM failed for token ${tokens[index].token}: ${res.error?.message || 'Unknown error'}`);
                this.tokenRepo.deactivate(tokens[index].token);
            }
        });

        this.logger.log(`FCM sent to user ${userId}: ${response.successCount} successful, ${response.failureCount} failed.`);
    }
    /**
    * Send a push notification to multiple users
    * @param userIds - The IDs of the users
    * @param title - The title of the notification
    * @param body - The body of the notification
    * @param data - The data to be sent with the notification (optional)
    * @returns The response from the FCM server
    */
    async sendToUsers(
        userIds: string[],
        title: string,
        body: string,
        data: any = {},
    ) {
        for (const userId of userIds) {
            await this.sendToUser(userId, title, body, data);
        }
    }
    /**
    * Send a push notification to all users
    * @param title - The title of the notification
    * @param body - The body of the notification
    * @param data - The data to be sent with the notification (optional)
    * @returns The response from the FCM server
    */
    async sendToAll(
        title: string,
        body: string,
        data: any = {},
    ) {
        return this.sendToAllUsers(title, body, data);
    }
    /**
    * Send a push notification to all users subscribed to "all_users" topic
    * @param title - The title of the notification
    * @param body - The body of the notification
    * @param data - The data to be sent with the notification (optional)
    * @returns The response from the FCM server
    */
    async sendToAllUsers(
        title: string,
        body: string,
        data: any = {},
    ) {
        const formattedData = this.formatFcmData(data);

        const message = {
            notification: { title, body },
            data: formattedData,
            topic: 'all_users',
        };

        let response;
        try {
            response = await this.firebase.messaging().send(message);
            this.logger.log(`FCM sent to all_users topic: ${response}`);
        } catch (error) {
            this.logger.error(`FCM failed for all_users topic: ${error.message}`);
            response = { error: error.message };
        }

        // Save to DB
        try {
            await this.pushNotificationModel.create({
                title,
                body,
                data, // Save original data structure
                response,
            });
        } catch (dbError) {
            this.logger.error(`Failed to save push notification log: ${dbError.message}`);
        }

        return {
            success: !response.error,
            messageId: response,
        };
    }
    /**
    * Get all broadcast notifications
    * @param page - The page number (optional)
    * @param limit - The number of notifications per page (optional)
    * @returns The list of notifications
    */
    /**
    * Get all broadcast notifications
    * @param page - The page number (optional)
    * @param limit - The number of notifications per page (optional)
    * @param filters - Optional filters (e.g. _id)
    * @returns The list of notifications
    */
    async getAllNotifications(page: number = 1, limit: number = 10, filters?: { _id?: string }) {
        const skip = (page - 1) * limit;
        const query: any = {};

        if (filters?._id) {
            query._id = filters._id;
        }

        const [data, total] = await Promise.all([
            this.pushNotificationModel
                .find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.pushNotificationModel.countDocuments(query),
        ]);

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
    * Send a push notification to a specific device
    * @param token - The FCM token of the device
    * @param title - The title of the notification
    * @param body - The body of the notification
    * @param data - The data to be sent with the notification (optional)
    * @returns The response from the FCM server
    */
    async sendToDevice(
        token: string,
        title: string,
        body: string,
        data: any = {},
    ) {
        try {
            const formattedData = this.formatFcmData(data);
            const response = await this.firebase.messaging().send({
                token,
                notification: { title, body },
                data: formattedData,
            });
            this.logger.log(`FCM sent to device ${token.substring(0, 10)}...: ${response}`);
            return response;
        } catch (error) {
            this.logger.error(`FCM failed for device ${token}: ${error.message}`);
            throw error;
        }
    }
    /**
    * Format data for FCM
    * @param data - The data to be formatted
    * @returns The formatted data
    */
    private formatFcmData(data: Record<string, any>): Record<string, string> {
        if (!data) return {};
        const formattedData: Record<string, string> = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'object' && value !== null) {
                formattedData[key] = JSON.stringify(value);
            } else {
                formattedData[key] = String(value);
            }
        }
        return formattedData;
    }
    /**
    * Get service worker content
    * @returns The service worker content
    */
    getServiceWorkerContent(): string {
        const apiKey = this.configService.get('FCM_CONFIG.API_KEY') || '';
        const projectId = this.configService.get('FCM_CONFIG.PROJECT_ID') || '';
        const messagingSenderId = this.configService.get('FCM_CONFIG.MESSAGING_SENDER_ID') || '';
        const appId = this.configService.get('FCM_CONFIG.APP_ID') || '';

        return `
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: '${apiKey}',
    projectId: '${projectId}',
    messagingSenderId: '${messagingSenderId}',
    appId: '${appId}',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/favicon.ico',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
`.trim();
    }
}

