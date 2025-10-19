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
import { json, urlencoded } from 'express';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Connection } from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get<ConfigService>(ConfigService);
  const PORT = Number(configService.get('APP_CONFIG.BACKEND_PORT')) || 5000;
  const NODE_ENV = configService.get('NODE_ENV') || 'development';

  // Configure WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // (a) Enable CORS globally via Nest
  app.enableCors({
    origin: '*',
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
    credentials: true,
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

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'Ado-dad API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
    customJs: `
      window.onload = () => {
        const token = localStorage.getItem('ado-dad-token');
        if (token) {
          const inp = document.querySelector('input[placeholder="Bearer token"]');
          if (inp) inp.value = token;
        }
        document.querySelector('button[class*="authorize"]')
          ?.addEventListener('click', () => {
            const inp = document.querySelector('input[placeholder="Bearer token"]');
            if (inp) localStorage.setItem('ado-dad-token', inp.value);
          });
      };
    `,
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
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
      skipMissingProperties: true,
    }),
  );
  // Limit JSON and urlencoded body sizes
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ limit: '1mb', extended: true }));
  app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

  const server = await app.listen(PORT, '0.0.0.0', () => {
    Logger.log(`🚀 Server listening on port ${PORT}`);
    Logger.log(`📚 Swagger UI: http://localhost:${PORT}/docs`);
    Logger.log(`🌍 ENV: ${NODE_ENV}`);
  });

  // Graceful shutdown handling
  const gracefulShutdown = async (signal: string) => {
    Logger.log(`🛑 Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
      Logger.log('🔒 HTTP server closed');

      try {
        // Close MongoDB connections
        const mongoose = await import('mongoose');
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.close();
          Logger.log('🔒 MongoDB connection closed');
        }

        // Close the NestJS application (this will trigger OnModuleDestroy for Redis)
        await app.close();
        Logger.log('🔒 Application closed');

        Logger.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        Logger.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
      }
    });

    // Force close after 30 seconds
    setTimeout(() => {
      Logger.error('⏰ Graceful shutdown timeout. Forcing exit...');
      process.exit(1);
    }, 30000);
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
