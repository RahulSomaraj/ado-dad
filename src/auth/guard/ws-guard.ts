// ws-guards/ws-jwt.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const client = ctx.switchToWs().getClient();

    this.logger.log(
      `WsJwtGuard: Processing connection for client ${client.id}`,
    );

    // Get token from auth or headers
    const rawAuth = (
      client.handshake.auth?.token ||
      client.handshake.headers['authorization'] ||
      ''
    ).toString();

    this.logger.log(
      `WsJwtGuard: Raw auth received: ${rawAuth ? 'present' : 'missing'}`,
    );

    const bearer = rawAuth.replace(/^Bearer\s+/i, '').trim();

    if (!bearer) {
      this.logger.warn(`WsJwtGuard: No token provided for client ${client.id}`);
      return false;
    }

    this.logger.log(`WsJwtGuard: Token length: ${bearer.length}`);

    try {
      // Decode token header to detect algorithm
      const decodedHdr: any = jwt.decode(bearer, { complete: true });
      const alg: string | undefined = decodedHdr?.header?.alg;
      let payload: any | null = null;

      this.logger.log(`WsJwtGuard: JWT alg detected: ${alg || 'unknown'}`);

      if (alg?.startsWith('HS')) {
        // Use HS256 with TOKEN_KEY
        const hsKey =
          process.env.TOKEN_KEY || 'default-secret-key-change-in-production';
        payload = jwt.verify(bearer, hsKey, { algorithms: ['HS256'] });
        this.logger.log(`WsJwtGuard: HS256 verification successful`);
      } else if (alg?.startsWith('RS')) {
        // Use RS256 with JWT_PUBLIC_KEY
        const rsKey = process.env.JWT_PUBLIC_KEY;
        if (!rsKey) {
          this.logger.warn('WsJwtGuard: JWT_PUBLIC_KEY not set for RS token');
          return false;
        }
        payload = jwt.verify(bearer, rsKey, { algorithms: ['RS256'] });
        this.logger.log(`WsJwtGuard: RS256 verification successful`);
      } else {
        // Unknown alg; attempt HS then RS
        this.logger.log(
          `WsJwtGuard: Unknown alg ${alg}, attempting fallback verification`,
        );
        const hsKey = process.env.TOKEN_KEY;
        const rsKey = process.env.JWT_PUBLIC_KEY;

        if (hsKey) {
          try {
            payload = jwt.verify(bearer, hsKey, { algorithms: ['HS256'] });
            this.logger.log(
              `WsJwtGuard: Fallback HS256 verification successful`,
            );
          } catch (e) {
            this.logger.warn(
              `WsJwtGuard: Fallback HS256 verification failed: ${(e as any)?.message}`,
            );
          }
        }

        if (!payload && rsKey) {
          try {
            payload = jwt.verify(bearer, rsKey, { algorithms: ['RS256'] });
            this.logger.log(
              `WsJwtGuard: Fallback RS256 verification successful`,
            );
          } catch (e) {
            this.logger.warn(
              `WsJwtGuard: Fallback RS256 verification failed: ${(e as any)?.message}`,
            );
          }
        }

        if (!payload) {
          this.logger.warn(
            `WsJwtGuard: JWT verification failed for alg: ${alg || 'unknown'}`,
          );
          return false;
        }
      }

      // Extract user ID from payload
      const userId = payload?.id || payload?.sub;
      if (!userId) {
        this.logger.warn(
          `WsJwtGuard: Token missing id/sub for client ${client.id}`,
        );
        this.logger.warn(
          `WsJwtGuard: Payload keys: ${Object.keys(payload || {}).join(', ')}`,
        );
        return false;
      }

      // Set user info on client
      (client as any).user = { id: userId, roles: payload?.roles };
      this.logger.log(
        `WsJwtGuard: User ${userId} authenticated for client ${client.id}`,
      );

      return true;
    } catch (error) {
      this.logger.warn(
        `WsJwtGuard: Token verification failed for client ${client.id}: ${(error as any)?.message}`,
      );
      return false;
    }
  }
}
