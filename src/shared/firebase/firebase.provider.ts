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
      // Check all required Firebase environment variables
      const missingKeys: string[] = [];

      if (!projectId) {
        missingKeys.push('FIREBASE_PROJECT_ID');
      }

      if (!clientEmail) {
        missingKeys.push('FIREBASE_CLIENT_EMAIL');
      }

      if (!privateKeyIsValid(rawPrivateKey)) {
        missingKeys.push('FIREBASE_PRIVATE_KEY');
      }

      if (missingKeys.length > 0) {
        const errorMessage = `Missing or invalid Firebase environment variables: ${missingKeys.join(', ')}. Please check your .env file.`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
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
  return !!(
    key &&
    key.includes('BEGIN PRIVATE KEY') &&
    key.includes('END PRIVATE KEY')
  );
}
