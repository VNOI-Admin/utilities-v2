import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { VpnModule } from './vpn/vpn.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get configService from app
  const configService = app.get(ConfigService);

  const config = new DocumentBuilder()
    .setTitle('User')
    .setDescription('User API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [UserModule, AuthModule, VpnModule],
  });
  SwaggerModule.setup('docs', app, document);

  await app.listen(8001, configService.get('LISTEN_HOST'));
}
bootstrap();
