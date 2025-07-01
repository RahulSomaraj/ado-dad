import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as morgan from 'morgan';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get<ConfigService>(ConfigService);
  const PORT = Number(configService.get('APP_CONFIG.BACKEND_PORT')) || 3000;

  // Serve static assets from public/assets at /ado-dad
  app.useStaticAssets(join(__dirname, '..', 'public', 'assets'), {
    prefix: '/ado-dad/',
  });

  // Apply global validation pipe with transformation enabled
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Apply morgan logging middleware
  app.use(morgan('tiny'));

  // Enable CORS globally
  app.enableCors({
    origin: '*', // Allows requests from all origins. Adjust this for production.
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Swagger setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ado-dad API')
    .setDescription('API for managing ado-dad')
    .setVersion('1.0')
    .addTag('Ado-Dad')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keep token after reload
    },
    customJs: `
      window.onload = function() {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          const bearerInput = document.querySelector('input[placeholder="Bearer token"]');
          if (bearerInput) {
            bearerInput.value = storedToken;
          }
        }
        document.querySelector('button[class*="authorize"]').onclick = function() {
          const bearerInput = document.querySelector('input[placeholder="Bearer token"]');
          if (bearerInput) {
            localStorage.setItem('token', bearerInput.value);
          }
        };
      };
    `,
  });

  await app.listen(PORT, () => {
    Logger.log(`Server started at port ${PORT}`);
  });
}

bootstrap();
