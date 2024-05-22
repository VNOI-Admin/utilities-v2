import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AuthModule } from "apps/auth/src/auth.module";

import { AppModule } from "./app.module";
import { UserModule } from "./user/user.module";
import { VpnModule } from "./vpn/vpn.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get configService from app
  const configService = app.get(ConfigService);
  const userEndpoint = configService.get("USER_SERVICE_ENDPOINT");

  const config = new DocumentBuilder()
    .addServer(userEndpoint)
    .setTitle("Utilities V2 User API Docs")
    .setDescription("Utilities V2 User API Docs")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [UserModule, AuthModule, VpnModule],
  });
  SwaggerModule.setup("docs", app, document);

  await app.listen(8001);
}

void bootstrap();
