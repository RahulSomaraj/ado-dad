import { Injectable, Logger } from '@nestjs/common';
import type { Namespace, Server } from 'socket.io';

export const userChannel = (userId: string) => `user:${userId}`;

/** Socket event names emitted by the server. Legacy names are kept for store builds. */
export const ChatEvents = {
  MESSAGE: 'message',
  MESSAGES_READ: 'messages_read',
  CONVERSATION_UPDATED: 'conversation_updated',
  AUTH_ERROR: 'auth_error',
  CONNECTED: 'connected',
} as const;

/**
 * Thin holder for the Socket.IO namespace so REST controllers and services can
 * emit realtime events without depending on the gateway (avoids a circular dep).
 */
@Injectable()
export class ChatEventsService {
  private readonly logger = new Logger(ChatEventsService.name);
  private server?: Namespace | Server;

  attach(server: Namespace | Server): void {
    this.server = server;
  }

  toRoom(roomId: string, event: string, payload: unknown): void {
    this.server?.to(roomId).emit(event, payload);
  }

  toUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(userChannel(userId)).emit(event, payload);
  }

  /** True when the user has at least one live socket on any instance (Redis adapter aware). */
  async isUserOnline(userId: string): Promise<boolean> {
    if (!this.server) return false;
    try {
      const sockets = await Promise.race([
        this.server.in(userChannel(userId)).fetchSockets(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
      ]);
      return sockets.length > 0;
    } catch (err) {
      this.logger.warn(`Presence lookup failed for ${userId}: ${(err as Error).message}`);
      return false;
    }
  }
}
