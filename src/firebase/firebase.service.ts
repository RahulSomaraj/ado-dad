import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
    private firebaseApp: admin.app.App;
    private readonly logger = new Logger(FirebaseService.name);

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        try {
            // Try to initialize using environment variables first
            const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
            const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
            const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

            if (projectId && clientEmail && privateKey) {
                if (!admin.apps.length) {
                    this.firebaseApp = admin.initializeApp({
                        credential: admin.credential.cert({
                            projectId,
                            clientEmail,
                            privateKey,
                        }),
                    });
                }
                this.logger.log('Firebase initialized successfully using environment variables.');
                return;
            }

            this.logger.warn(
                'Firebase could not be initialized using environment variables. FCM features will be unavailable. ' +
                'Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.'
            );
        } catch (error) {
            this.logger.error('Firebase initialization error', error.stack);
        }
    }

    getMessaging() {
        return admin.messaging();
    }
}
