// ws-guards/ws-jwt.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class WsJwtGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const client = ctx.switchToWs().getClient();
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers['authorization']?.replace('Bearer ', '');
    if (!token) return false;
    try {
      const payload = jwt.verify(token, process.env.JWT_PUBLIC_KEY!, {
        algorithms: ['RS256'],
      }) as any;
      client.user = { id: payload.sub, roles: payload.roles };
      return true;
    } catch {
      return false;
    }
  }
}
