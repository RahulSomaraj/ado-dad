import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

export const FirebaseProvider = {
  provide: 'FIREBASE_ADMIN',
  useFactory: (configService: ConfigService) => {
    const logger = new Logger('FirebaseProvider');

    // 1. Try environment variables
    const projectId = configService.get('FIREBASE_PROJECT_ID');
    const clientEmail = configService.get('FIREBASE_CLIENT_EMAIL');
    const privateKey = configService.get('FIREBASE_PRIVATE_KEY');

    if (projectId && clientEmail && privateKeyIsValid(privateKey)) {
      try {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
          });
        }
        logger.log('Firebase Admin initialized successfully using environment variables');
        return admin;
      } catch (error) {
        logger.warn(`Firebase Env initialization failed, trying JSON fallback: ${error.message}`);
      }
    }

    // 2. Try JSON fallback
    try {
      const saPath = path.join(process.cwd(), 'firebase-service-account.json');
      if (fs.existsSync(saPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        }
        logger.log('Firebase Admin initialized successfully using firebase-service-account.json');
        return admin;
      }
    } catch (error) {
      logger.error(`Firebase JSON initialization failed: ${error.message}`);
    }

    logger.error('Firebase Admin could not be initialized. Please check environment variables or service-account.json');
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
