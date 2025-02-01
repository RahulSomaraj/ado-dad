import { Injectable, NestMiddleware } from '@nestjs/common';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    // Apply Helmet middleware (for basic security headers)
    helmet()(req, res, next);

    // Apply CORS middleware
    cors()(req, res, next);

    // Apply Rate Limiting middleware
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests pe windowMs
    });
    limiter(req, res, next); // Apply Rate Limiting
  }
}
