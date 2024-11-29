import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { AuthModule } from './auth/auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation with transform
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  // Get configService from app
  const configService = app.get(ConfigService);
  const authEndpoint = configService.get('AUTH_SERVICE_ENDPOINT');

  app.enableCors({ credentials: true, origin: true });

  const config = new DocumentBuilder()
    .addServer(authEndpoint)
    .setTitle('Utilities V2 Auth API Docs')
    .setDescription('Utilities V2 Auth API Docs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [AuthModule],
  });
  SwaggerModule.setup('docs', app, document);

  await app.listen(8002);
}

void bootstrap();
