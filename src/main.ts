import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as morgan from 'morgan';
import helmet from 'helmet';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const configService = app.get<ConfigService>(ConfigService);
    const PORT = Number(configService.get('APP_CONFIG.BACKEND_PORT')) || 5000;
    const NODE_ENV = configService.get('NODE_ENV') || 'development';

    // Security headers
    app.use(
      helmet({
        contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
      }),
    );

    // Optimized CORS configuration
    const allowedOrigins =
      NODE_ENV === 'production'
        ? [configService.get('FRONTEND_URL') || 'http://localhost:3000']
        : [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:5000',
          ];

    app.enableCors({
      origin: allowedOrigins,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Requested-With',
      ],
      credentials: true,
      maxAge: 86400, // 24 hours
    });

    // Static file serving with caching
    const staticOptions = {
      maxAge: '1d',
      etag: true,
      lastModified: true,
    };

    app.useStaticAssets(join(__dirname, '..', 'public', 'assets'), {
      prefix: '/ado-dad/',
      ...staticOptions,
    });

    app.useStaticAssets(join(__dirname, '..', 'public'), {
      prefix: '/',
      ...staticOptions,
    });

    // Global validation pipe with optimized settings
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Conditional logging based on environment
    if (NODE_ENV !== 'test') {
      app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
    }

    // Swagger configuration
    if (NODE_ENV !== 'production') {
      const swaggerConfig = new DocumentBuilder()
        .setTitle('Ado-dad API')
        .setDescription(
          'API for managing ado-dad - A comprehensive advertisement platform',
        )
        .setVersion('1.0.0')
        .addTag(
          'Authentication',
          'User authentication and authorization endpoints',
        )
        .addTag('Ads', 'Advertisement management endpoints')
        .addTag('Users', 'User management endpoints')
        .addTag('Vehicles', 'Vehicle-related endpoints')
        .addTag('Categories', 'Category management endpoints')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token',
            in: 'header',
          },
          'JWT-auth',
        )
        .build();

      const document = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup('docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
          docExpansion: 'none',
          filter: true,
          showRequestDuration: true,
        },
        customSiteTitle: 'Ado-dad API Documentation',
        customCss: '.swagger-ui .topbar { display: none }',
        customJs: `
          window.onload = function() {
            const storedToken = localStorage.getItem('ado-dad-token');
            if (storedToken) {
              const bearerInput = document.querySelector('input[placeholder="Bearer token"]');
              if (bearerInput) {
                bearerInput.value = storedToken;
              }
            }
            document.querySelector('button[class*="authorize"]').onclick = function() {
              const bearerInput = document.querySelector('input[placeholder="Bearer token"]');
              if (bearerInput) {
                localStorage.setItem('ado-dad-token', bearerInput.value);
              }
            };
          };
        `,
      });
    }

    await app.listen(PORT, '0.0.0.0', () => {
      Logger.log(`🚀 Server started successfully on port ${PORT}`);
      Logger.log(
        `📚 API Documentation available at http://localhost:${PORT}/docs`,
      );
      Logger.log(`🌍 Environment: ${NODE_ENV}`);
    });
  } catch (error) {
    Logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  Logger.error('❌ Bootstrap failed:', error);
  process.exit(1);
});
