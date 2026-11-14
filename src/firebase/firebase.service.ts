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
            const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID') || process.env.FIREBASE_PROJECT_ID;
            const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL') || process.env.FIREBASE_CLIENT_EMAIL;
            const rawPrivateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY') || process.env.FIREBASE_PRIVATE_KEY;

            if (projectId && clientEmail && rawPrivateKey) {
                // Robust private key parsing
                // 1. Trim whitespace
                // 2. Remove literal quotes if present
                // 3. Replace escaped newlines with actual newlines
                const privateKey = rawPrivateKey
                    .trim()
                    .replace(/^"|"$/g, '')
                    .replace(/\\n/g, '\n');

                this.logger.log(`Attempting to initialize Firebase for project: ${projectId}`);
                this.logger.log(`Client Email: ${clientEmail}`);
                this.logger.log(`Private Key length: ${privateKey.length} chars (starts with: ${privateKey.substring(0, 30)}...)`);

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
            this.logger.error(`Firebase initialization error: ${error.message}`, error.stack);
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
