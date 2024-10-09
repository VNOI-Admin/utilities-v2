import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { PrintingModule } from './printing/printing.module';

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
  const printingEndpoint = configService.get('PRINTING_SERVICE_ENDPOINT');

  const config = new DocumentBuilder()
    .addServer(printingEndpoint)
    .setTitle('Utilities V2 Printing API Docs')
    .setDescription('Utilities V2 Printing API Docs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [PrintingModule],
  });
  SwaggerModule.setup('docs', app, document);

  await app.listen(8003, '0.0.0.0');
}

void bootstrap();
