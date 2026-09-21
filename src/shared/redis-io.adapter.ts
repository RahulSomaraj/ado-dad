import { Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

/**
 * Socket.IO adapter backed by Redis pub/sub.
 *
 * When Redis is configured (REDIS_URL, or REDIS_HOST/REDIS_PORT/REDIS_PASSWORD),
 * room broadcasts (server.to(roomId).emit(...)) work across multiple app
 * instances (PM2 cluster / ECS tasks). If Redis is not configured or the
 * connection fails, it falls back to the default in-memory adapter
 * (single-instance mode) so local development keeps working unchanged.
 *
 * Hardening notes:
 *  - Startup connect attempts are BOUNDED. Previously a bad/unreachable Redis
 *    left two orphan clients retrying forever, spamming
 *    "Redis pub/sub client error: Connection timeout" every ~5s for the life
 *    of the process. Now we give up, tear the clients down, and fall back.
 *  - Once connected, reconnection IS unlimited (normal transient-outage
 *    behaviour) but error logs are throttled.
 *  - REDIS_URL is validated. An unencoded '@' or '#' in the password silently
 *    corrupts the URL (e.g. `redis://:p@ss#word@127.0.0.1:6379/0` parses to
 *    host "2026"-style garbage), which is what produced the timeout loop.
 */

const STARTUP_MAX_RETRIES = 3;
const CONNECT_TIMEOUT_MS = Number(process.env.REDIS_CONNECT_TIMEOUT_MS) || 5000;
const ERROR_LOG_INTERVAL_MS = 60_000;

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private clients: any[] = [];
  private connected = false;
  private lastErrorLoggedAt = 0;

  private resolveUrl(): string | null {
    const rawUrl = process.env.REDIS_URL?.trim();

    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        if (!parsed.hostname) throw new Error('missing hostname');
        if (parsed.hash) {
          throw new Error(
            `URL contains an unescaped '#' — the password must be percent-encoded ('#' -> %23, '@' -> %40)`,
          );
        }
        if (rawUrl.split('@').length > 2) {
          throw new Error(
            `URL contains more than one '@' — the password must be percent-encoded ('@' -> %40)`,
          );
        }
        return rawUrl;
      } catch (err: any) {
        this.logger.error(
          `❌ REDIS_URL is malformed (${err?.message}) — ignoring it and falling back to REDIS_HOST/REDIS_PORT/REDIS_PASSWORD`,
        );
      }
    }

    const host = process.env.REDIS_HOST?.trim();
    if (!host) return null;

    const port = process.env.REDIS_PORT?.trim() || '6379';
    const password = process.env.REDIS_PASSWORD;
    const username = process.env.REDIS_USERNAME || '';
    const db = process.env.REDIS_DB?.trim();
    const scheme = process.env.REDIS_TLS === 'true' ? 'rediss' : 'redis';

    const auth = password
      ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
      : '';

    return `${scheme}://${auth}${host}:${port}${db ? `/${db}` : ''}`;
  }

  private logThrottled(message: string): void {
    const now = Date.now();
    if (now - this.lastErrorLoggedAt < ERROR_LOG_INTERVAL_MS) return;
    this.lastErrorLoggedAt = now;
    this.logger.error(message);
  }

  private async teardown(): Promise<void> {
    await Promise.all(
      this.clients.map(async (client) => {
        try {
          client.removeAllListeners('error');
          client.on('error', () => undefined);
          if (typeof client.destroy === 'function') client.destroy();
          else await client.disconnect();
        } catch {
          /* client was never open — nothing to close */
        }
      }),
    );
    this.clients = [];
  }

  async connectToRedis(): Promise<boolean> {
    const url = this.resolveUrl();

    if (!url) {
      this.logger.warn(
        '⚠️ No REDIS_URL/REDIS_HOST configured — Socket.IO running in single-instance mode',
      );
      return false;
    }

    const safeUrl = url.replace(/\/\/[^@]*@/, '//***@');

    const options = {
      url,
      socket: {
        connectTimeout: CONNECT_TIMEOUT_MS,
        // Bounded while starting up, unlimited once we've been connected once.
        reconnectStrategy: (retries: number) => {
          if (!this.connected && retries >= STARTUP_MAX_RETRIES) return false;
          return Math.min(200 * 2 ** retries, 10_000);
        },
      },
    };

    const pubClient = createClient(options);
    const subClient = pubClient.duplicate();
    this.clients = [pubClient, subClient];

    pubClient.on('error', (err) =>
      this.logThrottled(`Redis pub client error: ${err?.message}`),
    );
    subClient.on('error', (err) =>
      this.logThrottled(`Redis sub client error: ${err?.message}`),
    );

    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.connected = true;
      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log(
        `✅ Socket.IO Redis adapter connected (${safeUrl}) — multi-instance broadcasts enabled`,
      );
      return true;
    } catch (err: any) {
      this.adapterConstructor = null;
      await this.teardown();
      this.logger.error(
        `❌ Failed to connect Socket.IO Redis adapter to ${safeUrl} after ${STARTUP_MAX_RETRIES} attempts (${err?.message}) — falling back to single-instance mode. ` +
          `In PM2 cluster mode this means socket broadcasts will NOT reach clients on other workers.`,
      );
      return false;
    }
  }

  async closeRedis(): Promise<void> {
    this.connected = false;
    this.adapterConstructor = null;
    await this.teardown();
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
