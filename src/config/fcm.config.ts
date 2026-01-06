import { registerAs } from '@nestjs/config';

export default registerAs('FCM_CONFIG', () => ({
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
  FIREBASE_VAPID_KEY: process.env.FIREBASE_VAPID_KEY,
}));
