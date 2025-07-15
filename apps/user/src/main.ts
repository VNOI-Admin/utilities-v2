import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation with transform
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.use(json());
  app.use(urlencoded({ extended: true }));
  app.use(cookieParser());

  app.enableCors({ credentials: true, origin: true });

  // Get configService from app
  const configService = app.get(ConfigService);
  const userEndpoint = configService.get('USER_SERVICE_ENDPOINT');

  const config = new DocumentBuilder()
    .addServer(userEndpoint)
    .setTitle('Utilities V2 User API Docs')
    .setDescription('Utilities V2 User API Docs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(8001);
}

void bootstrap();
