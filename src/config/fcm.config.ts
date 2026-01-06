import { registerAs } from '@nestjs/config';

export default registerAs('FCM_CONFIG', () => ({
    API_KEY: process.env.FIREBASE_API_KEY,
    PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
    APP_ID: process.env.FIREBASE_APP_ID,
    VAPID_KEY: process.env.FIREBASE_VAPID_KEY,
}));
 