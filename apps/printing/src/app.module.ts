import { DatabaseModule } from '@libs/common-db/database.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrintingModule } from './printing/printing.module';
import { TaskModule } from 'apps/printing/src/task/task.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    PrintingModule,
    TaskModule,
    JwtModule.register({ global: true }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
