import { registerAs } from '@nestjs/config';

export default registerAs('REDIS_CONFIG', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  connectTimeout: 10000,
  keyPrefix: 'adodad:',
}));
