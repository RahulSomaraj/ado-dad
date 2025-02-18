import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as morgan from 'morgan';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService>(ConfigService);
  const PORT = Number(configService.get('APP_CONFIG.BACKEND_PORT')) || 3000;

  // Apply global validation pipe with transformation enabled
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Apply morgan logging middleware
  app.use(morgan('tiny'));

  // Enable CORS globally (customize options as needed)
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept',
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
  SwaggerModule.setup('api-docs', app, document, {
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
