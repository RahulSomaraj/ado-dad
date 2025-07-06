import * as dotenv from 'dotenv';
dotenv.config();
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
    console.log(process.env);

    // Security headers - Permissive for all platforms
    app.use(
      helmet({
        contentSecurityPolicy: false, // Disable CSP for all platforms
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginOpenerPolicy: false,
        referrerPolicy: false,
        hsts: false,
        noSniff: false,
        frameguard: false,
        dnsPrefetchControl: false,
        ieNoOpen: false,
        permittedCrossDomainPolicies: false,
      }),
    );

    // Global CORS middleware for all responses
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS, HEAD',
      );
      res.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Accept, Authorization, X-Requested-With, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, X-API-Key, X-Client-Version, X-Platform, User-Agent',
      );
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
      res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
      res.header('Cross-Origin-Opener-Policy', 'unsafe-none');

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }

      next();
    });

    // Static file serving with CORS support for all platforms
    const staticOptions = {
      maxAge: '1d',
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        // Allow CORS for all static files
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Content-Type, Accept, Authorization, X-Requested-With',
        );
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

        // Set proper content type for images
        if (path.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
          res.setHeader('Content-Type', 'image/jpeg');
        } else if (path.endsWith('.gif')) {
          res.setHeader('Content-Type', 'image/gif');
        } else if (path.endsWith('.webp')) {
          res.setHeader('Content-Type', 'image/webp');
        } else if (path.endsWith('.svg')) {
          res.setHeader('Content-Type', 'image/svg+xml');
        }
      },
    };

    // Serve assets with CORS support
    app.useStaticAssets(join(__dirname, '..', 'public', 'assets'), {
      prefix: '/assets/',
      ...staticOptions,
    });

    // Serve images with CORS support
    app.useStaticAssets(join(__dirname, '..', 'public', 'images'), {
      prefix: '/images/',
      ...staticOptions,
    });

    // // Serve uploads directory with CORS support
    // app.useStaticAssets(join(__dirname, '..', 'public', 'uploads'), {
    //   prefix: '/uploads/',
    //   ...staticOptions,
    // });

    // Serve all public files with CORS support
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
          docExpansion: 'list',
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
