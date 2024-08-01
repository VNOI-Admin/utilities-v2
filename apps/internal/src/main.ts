import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const internalEndpoint = configService.get('INTERNAL_SERVICE_ENDPOINT');

  const config = new DocumentBuilder()
    .addServer(internalEndpoint)
    .setTitle('Utilities V2 Internal API Docs')
    .setDescription('Utilities V2 Internal API Docs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(8003);
}

void bootstrap();
