import { Injectable, Logger, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
    private firebaseApp: admin.app.App;
    private readonly logger = new Logger(FirebaseService.name);
    private isInitialized = false;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        try {
            if (admin.apps.length > 0) {
                this.logger.log('Firebase already initialized.');
                this.firebaseApp = admin.app();
                this.isInitialized = true;
                return;
            }

            // Try to initialize using environment variables
            const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
            const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
            const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

            if (projectId && clientEmail && privateKey) {
                this.firebaseApp = admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId,
                        clientEmail,
                        privateKey,
                    }),
                });
                this.isInitialized = true;
                this.logger.log('Firebase initialized successfully using environment variables.');
                return;
            }

            this.logger.error(
                'Firebase could not be initialized using environment variables. FCM features will be unavailable. ' +
                'Missing one or more: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.'
            );
        } catch (error) {
            this.logger.error('Firebase initialization error', error.stack);
        }
    }

    getMessaging() {
        if (!this.isInitialized) {
            throw new InternalServerErrorException(
                'Firebase Messaging is not initialized. Please check FIREBASE credentials in environment variables.'
            );
        }
        return admin.messaging();
    }
}
