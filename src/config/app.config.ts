import { registerAs } from '@nestjs/config';

export default registerAs('APP_CONFIG', () => ({
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  BACKEND_PORT: parseInt(process.env.BACKEND_PORT || '0', 10) || 5000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // JWT Configuration
  TOKEN_KEY: process.env.TOKEN_KEY || 'default-secret-key-change-in-production',
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || '1h',
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '60d',

  // Database Configuration
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/ado-dad',
  MONGO_MAX_POOL_SIZE:
    parseInt(process.env.MONGO_MAX_POOL_SIZE || '0', 10) || 10,
  MONGO_SERVER_SELECTION_TIMEOUT:
    parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT || '0', 10) || 5000,
  MONGO_SOCKET_TIMEOUT:
    parseInt(process.env.MONGO_SOCKET_TIMEOUT || '0', 10) || 45000,

  // AWS S3 Configuration
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,

  // Email Configuration
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '0', 10) || 587,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.EMAIL_USER,

  // Redis Configuration (Optional)
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '0', 10) || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,

  // Security Configuration
  ENCRYPTION_KEY:
    process.env.ENCRYPTION_KEY || 'your_32_char_secret_key_here_123',
  SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS || '0', 10) || 10,

  // Rate Limiting
  RATE_LIMIT_TTL: parseInt(process.env.RATE_LIMIT_TTL || '0', 10) || 60,
  RATE_LIMIT_LIMIT: parseInt(process.env.RATE_LIMIT_LIMIT || '0', 10) || 100,

  // File Upload Configuration
  MAX_FILE_SIZE:
    parseInt(process.env.MAX_FILE_SIZE || '0', 10) || 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'jpg',
    'jpeg',
    'png',
    'webp',
  ],

  // Logging Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING === 'true',

  // Feature Flags
  ENABLE_SWAGGER: process.env.ENABLE_SWAGGER !== 'false',
  ENABLE_WEBSOCKETS: process.env.ENABLE_WEBSOCKETS !== 'false',
  ENABLE_FILE_UPLOAD: process.env.ENABLE_FILE_UPLOAD !== 'false',
}));
