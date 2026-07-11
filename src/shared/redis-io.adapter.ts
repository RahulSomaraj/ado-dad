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
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  async connectToRedis(): Promise<boolean> {
    const url =
      process.env.REDIS_URL ||
      (process.env.REDIS_HOST
        ? `redis://${process.env.REDIS_PASSWORD ? `:${encodeURIComponent(process.env.REDIS_PASSWORD)}@` : ''}${process.env.REDIS_HOST}:${process.env.REDIS_PORT || '6379'}`
        : null);

    if (!url) {
      this.logger.warn(
        '⚠️ No REDIS_URL/REDIS_HOST configured — Socket.IO running in single-instance mode',
      );
      return false;
    }

    try {
      const pubClient = createClient({ url });
      const subClient = pubClient.duplicate();
      pubClient.on('error', (err) =>
        this.logger.error(`Redis pub client error: ${err?.message}`),
      );
      subClient.on('error', (err) =>
        this.logger.error(`Redis sub client error: ${err?.message}`),
      );

      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log(
        '✅ Socket.IO Redis adapter connected — multi-instance broadcasts enabled',
      );
      return true;
    } catch (err: any) {
      this.logger.error(
        `❌ Failed to connect Socket.IO Redis adapter (${err?.message}) — falling back to single-instance mode`,
      );
      this.adapterConstructor = null;
      return false;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
