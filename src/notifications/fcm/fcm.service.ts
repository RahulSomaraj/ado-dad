import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FcmTokenRepository } from './repositories/fcm-token.repo';

@Injectable()
export class FcmService {
    private readonly logger = new Logger(FcmService.name);

    constructor(
        @Inject('FIREBASE_ADMIN') private readonly firebase: any,
        private readonly tokenRepo: FcmTokenRepository,
        private readonly configService: ConfigService,
    ) { }

    async registerToken(userId: string, token: string, platform: string, deviceId?: string) {
        // Subscribe to "all" topic for global broadcasts
        try {
            await this.firebase.messaging().subscribeToTopic(token, 'all');
            this.logger.debug(`Token ${token.substring(0, 10)}... subscribed to 'all' topic`);
        } catch (error) {
            this.logger.error(`Failed to subscribe token to 'all' topic: ${error.message}`);
        }
        return this.tokenRepo.upsert(userId, token, platform, deviceId);
    }

    async sendToUser(
        userId: string,
        title: string,
        body: string,
        data: Record<string, string> = {},
    ) {
        const tokens = await this.tokenRepo.findActiveByUser(userId);
        if (!tokens.length) return;

        const response = await this.firebase.messaging().sendEachForMulticast({
            notification: { title, body },
            data,
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

    async sendToUsers(
        userIds: string[],
        title: string,
        body: string,
        data: Record<string, string> = {},
    ) {
        for (const userId of userIds) {
            await this.sendToUser(userId, title, body, data);
        }
    }

    async sendToAll(
        title: string,
        body: string,
        data: Record<string, string> = {},
    ) {
        const message = {
            notification: { title, body },
            data,
            topic: 'all',
        };

        try {
            const response = await this.firebase.messaging().send(message);
            this.logger.log(`FCM sent to all topic: ${response}`);
        } catch (error) {
            this.logger.error(`FCM failed for all topic: ${error.message}`);
        }
    }

    async sendToDevice(
        token: string,
        title: string,
        body: string,
        data: Record<string, string> = {},
    ) {
        try {
            const response = await this.firebase.messaging().send({
                token,
                notification: { title, body },
                data,
            });
            this.logger.log(`FCM sent to device ${token.substring(0, 10)}...: ${response}`);
            return response;
        } catch (error) {
            this.logger.error(`FCM failed for device ${token}: ${error.message}`);
            throw error;
        }
    }

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
