import { SystemConfig, SystemConfigSchema } from '@libs/common-db/schemas/systemConfig.schema';
import { GuardsModule } from '@libs/common/guards/guards.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SystemConfigController } from './system-config.controller';

@Module({
  imports: [GuardsModule, MongooseModule.forFeature([{ name: SystemConfig.name, schema: SystemConfigSchema }])],
  controllers: [SystemConfigController],
})
export class SystemConfigModule {}
