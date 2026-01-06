import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

export const FirebaseProvider = {
    provide: 'FIREBASE_ADMIN',
    useFactory: (configService: ConfigService) => {
        const logger = new Logger('FirebaseProvider');
        const projectId = configService.get('FIREBASE_PROJECT_ID');
        const clientEmail = configService.get('FIREBASE_CLIENT_EMAIL');
        const rawPrivateKey = configService.get('FIREBASE_PRIVATE_KEY');

        if (!admin.apps.length) {
            if (!privateKeyIsValid(rawPrivateKey)) {
                logger.error('FIREBASE_PRIVATE_KEY is missing or invalid. Firebase will NOT handle notifications correctly.');
                // We might want to throw here to fail fast, or just mock it to prevent crash loop if optional
                // Given the error crashed the app, best to fail fast but with a better message, 
                // OR initialize with a stub if we want to allow app to start (but user wants it fixed).
                // Let's throw a cleaner error.
                throw new Error('FIREBASE_PRIVATE_KEY is missing or invalid in environment variables.');
            }

            try {
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId,
                        clientEmail,
                        privateKey: rawPrivateKey.replace(/\\n/g, '\n'),
                    }),
                });
                logger.log('Firebase Admin initialized successfully');
            } catch (error) {
                logger.error(`Firebase initialization failed: ${error.message}`);
                throw error;
            }
        }
        return admin;
    },
    inject: [ConfigService],
};

function privateKeyIsValid(key: string): boolean {
    return key && key.includes('BEGIN PRIVATE KEY') && key.includes('END PRIVATE KEY');
}
