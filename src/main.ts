import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService>(ConfigService);
  const PORT = configService.get('APP_CONFIG.BACKEND_PORT');

  // Apply global validation pipe (optional)
  app.useGlobalPipes(new ValidationPipe());

  // Enable CORS globally (you can customize the options as needed)
  app.enableCors({
    origin: '*', // Allow all domains (you can specify specific domains here)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allowed HTTP methods
    allowedHeaders: 'Content-Type, Accept', // Allowed headers
  });

  // Apply security middleware globally

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Ado-dad API')
    .setDescription('API for managing ado-dad')
    .setVersion('1.0')
    .addTag('Ado-Dad')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
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
    Logger.log(`Server Started at ${PORT}`);
  });
}

bootstrap();
