import { registerAs } from '@nestjs/config';

export default registerAs('APP_CONFIG', () => ({
  BACKEND_PORT: process.env.BACKEND_PORT || 3000,
  TOKEN_KEY: process.env.TOKEN_KEY || '',
}));

