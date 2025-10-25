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
  const syncEndpoint = configService.get('SYNC_SERVICE_ENDPOINT');
  const port = configService.get('SYNC_SERVICE_PORT') || 8005;

  const config = new DocumentBuilder()
    .addServer(syncEndpoint)
    .setTitle('Utilities V2 Sync API Docs')
    .setDescription('Utilities V2 Sync API Docs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
}

void bootstrap();
