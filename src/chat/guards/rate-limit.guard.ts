import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Socket } from 'socket.io';

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly rateLimitStore = new Map<
    string,
    { count: number; resetTime: number }
  >();

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      'rateLimit',
      context.getHandler(),
    );

    if (!rateLimitOptions) {
      return true; // No rate limiting configured
    }

    const request = context.switchToHttp().getRequest();
    const socket = context.switchToWs().getClient<Socket>();

    let identifier: string;

    if (request) {
      // HTTP request
      identifier = this.getHttpIdentifier(request);
    } else if (socket) {
      // WebSocket request
      identifier = this.getSocketIdentifier(socket);
    } else {
      return true; // Unknown context
    }

    return this.checkRateLimit(identifier, rateLimitOptions);
  }

  private getHttpIdentifier(req: any): string {
    // Use IP address or user ID if authenticated
    return req.user?.id || req.ip || 'anonymous';
  }

  private getSocketIdentifier(socket: Socket): string {
    // Use user ID from socket or socket ID as fallback
    return (socket as any).user?.id || socket.id;
  }

  private checkRateLimit(
    identifier: string,
    options: RateLimitOptions,
  ): boolean {
    const now = Date.now();
    const key = `${identifier}:${Math.floor(now / options.windowMs)}`;

    const current = this.rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
      // Reset or create new window
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return true;
    }

    if (current.count >= options.maxRequests) {
      // Rate limit exceeded
      throw new HttpException(
        options.message || 'Rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    current.count++;
    return true;
  }

  // Clean up expired entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.rateLimitStore.entries()) {
      if (now > value.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }
}

// Decorator for rate limiting
export const RateLimit = (options: RateLimitOptions) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('rateLimit', options, descriptor.value);
    return descriptor;
  };
};
