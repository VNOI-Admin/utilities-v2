import { SystemConfig, SystemConfigSchema } from '@libs/common-db/schemas/systemConfig.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SystemConfigController } from './system-config.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: SystemConfig.name, schema: SystemConfigSchema }])],
  controllers: [SystemConfigController],
})
export class SystemConfigModule {}
