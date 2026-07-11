import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as morgan from 'morgan';
import helmet from 'helmet';
import * as compression from 'compression';
import { json, urlencoded, text } from 'express';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { RedisIoAdapter } from './shared/redis-io.adapter';
import { Connection } from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get<ConfigService>(ConfigService);
  const PORT = Number(configService.get('APP_CONFIG.BACKEND_PORT')) || 5000;
  const NODE_ENV = configService.get('NODE_ENV') || 'development';

  // Configure WebSocket adapter (Redis-backed when Redis is configured,
  // falls back to in-memory single-instance adapter otherwise)
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // (a) Enable CORS globally via Nest
  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Requested-With',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'X-API-Key',
      'X-Client-Version',
      'X-Platform',
      'User-Agent',
    ],
    // Only send credentials when an explicit origin allow-list is configured
    // (wildcard origin + credentials is unsafe and blocked by browsers).
    credentials: corsOrigins.length > 0,
  });

  // (b) Global security headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: false /* …etc… */,
    }),
  );

  // (b.1) Compression for responses
  app.use(
    compression({
      threshold: 1024, // compress payloads > 1KB
    }) as any,
  );

  // (c) Set up Swagger **before** any “catch-all” static mount
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ado-dad API')
    .setDescription('The Ado-dad API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  if (NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true')
    SwaggerModule.setup('docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
      onComplete: function () {
        // Wait for Swagger UI to be fully initialized before accessing DOM
        setTimeout(function () {
          try {
            var token = localStorage.getItem('ado-dad-token');
            if (token) {
              // Only target the global authorization input in the top bar, not path parameters
              // Look for the authorization modal/dialog input specifically
              var authModal = document.querySelector(
                '.swagger-ui .auth-container input[type="text"]',
              );
              if (!authModal) {
                // Try alternative selector for Swagger UI authorization
                authModal = document.querySelector(
                  '.swagger-ui .auth-btn-wrapper input',
                );
              }
              if (!authModal) {
                // Try the authorize button's associated input
                var authSection = document.querySelector(
                  '.swagger-ui .auth-wrapper',
                );
                if (authSection) {
                  authModal = authSection.querySelector('input[type="text"]');
                }
              }

              // Only set value if we found the actual authorization input
              // Make sure it's not a path parameter input
              if (
                authModal &&
                !authModal.closest('.parameters') &&
                !authModal.hasAttribute('data-param-name')
              ) {
                (authModal as HTMLInputElement).value = token.replace(
                  'Bearer ',
                  '',
                );
              }
            }

            // Save token when authorize button is clicked (global authorize button only)
            var authorizeBtn = document.querySelector(
              '.swagger-ui .btn.authorize',
            );
            if (authorizeBtn) {
              authorizeBtn.addEventListener('click', function () {
                setTimeout(function () {
                  // Only get token from the authorization modal, not path parameters
                  var authInput = document.querySelector(
                    '.swagger-ui .auth-container input[type="text"]',
                  ) as HTMLInputElement;
                  if (
                    authInput &&
                    authInput.value &&
                    !authInput.closest('.parameters')
                  ) {
                    localStorage.setItem('ado-dad-token', authInput.value);
                  }
                }, 100);
              });
            }
          } catch (error) {
            // Silently handle errors in browser context
            console.warn('Swagger UI token initialization error:', error);
          }
        }, 500);
      },
    },
    customSiteTitle: 'Ado-dad API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
    // Fix: Use CDN assets to avoid path issues
    customCssUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.3/swagger-ui.min.css',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.3/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.3/swagger-ui-standalone-preset.min.js',
    ],
  });

  // (d) Now mount only the **specific** static folders you actually need…
  const staticOptions = {
    prefix: '/assets/',
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      // …etc…
    },
  };
  app.useStaticAssets(join(__dirname, '..', 'public', 'assets'), staticOptions);

  // …any other specific mounts…

  // (e) Global pipes, logging, etc.
  app.useGlobalPipes(
    new ValidationPipe({
      // transform: true,
      // whitelist: true,
      // forbidNonWhitelisted: true,
      // transformOptions: { enableImplicitConversion: true },
      whitelist: true, // strip unknown props → blocks mass-assignment & Mongo operator injection
      skipMissingProperties: true,
    }),
  );
  // Limit JSON and urlencoded body sizes
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ limit: '1mb', extended: true }));
  app.use(
    text({
      type: [
        'text/csv',
        'application/csv',
        'text/plain',
        'text/x-csv',
        'text/comma-separated-values',
        'application/x-csv',
        'application/vnd.ms-excel',
      ],
      limit: '5mb',
    }),
  );
  app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

  const server = await app.listen(PORT, '0.0.0.0', () => {
    Logger.log(`🚀 Server listening on port ${PORT}`);
    Logger.log(`📚 Swagger UI: http://localhost:${PORT}/docs`);
    Logger.log(`🌍 ENV: ${NODE_ENV}`);
  });

  // Graceful shutdown handling
  let isShuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) {
      Logger.warn('⚠️  Shutdown already in progress, ignoring signal');
      return;
    }
    isShuttingDown = true;

    Logger.log(`🛑 Received ${signal}. Starting graceful shutdown...`);

    // Set a timeout for the entire shutdown process
    const shutdownTimeout = setTimeout(() => {
      Logger.error('⏰ Graceful shutdown timeout. Forcing exit...');
      process.exit(1);
    }, 10000); // Reduced to 10 seconds

    try {
      // Stop accepting new connections
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            Logger.warn('⚠️  Error closing HTTP server:', err);
          } else {
            Logger.log('🔒 HTTP server closed');
          }
          resolve();
        });

        // Force close server after 5 seconds if it doesn't close gracefully
        setTimeout(() => {
          Logger.warn('⚠️  HTTP server close timeout, forcing close');
          resolve();
        }, 5000);
      });

      // Close the NestJS application (this will trigger OnModuleDestroy for Redis)
      try {
        await Promise.race([
          app.close(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('App close timeout')), 5000),
          ),
        ]);
        Logger.log('🔒 Application closed');
      } catch (error) {
        Logger.warn('⚠️  Error closing application:', error);
      }

      // Close MongoDB connections
      try {
        const mongoose = await import('mongoose');
        if (mongoose.connection.readyState === 1) {
          await Promise.race([
            mongoose.connection.close(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('MongoDB close timeout')), 3000),
            ),
          ]);
          Logger.log('🔒 MongoDB connection closed');
        }
      } catch (error) {
        Logger.warn('⚠️  Error closing MongoDB:', error);
      }

      clearTimeout(shutdownTimeout);
      Logger.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      clearTimeout(shutdownTimeout);
      Logger.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Handle different termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    Logger.error('💥 Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    Logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });

  return server;
}

bootstrap().catch((error) => {
  Logger.error('❌ Bootstrap failed:', error);
  process.exit(1);
});
