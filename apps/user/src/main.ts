import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { UserModule } from './user/user.module';
import { VpnModule } from './vpn/vpn.module';
import { GroupModule } from './group/group.module';

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
  const userEndpoint = configService.get('USER_SERVICE_ENDPOINT');

  const config = new DocumentBuilder()
    .addServer(userEndpoint)
    .setTitle('Utilities V2 User API Docs')
    .setDescription('Utilities V2 User API Docs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [UserModule, GroupModule, VpnModule],
  });
  SwaggerModule.setup('docs', app, document);

  await app.listen(8001);
}

void bootstrap();
