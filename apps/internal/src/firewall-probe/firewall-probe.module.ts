import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import { FirewallProbeCoreModule } from '@libs/common/firewall-probe/firewall-probe.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FirewallProbeController } from './firewall-probe.controller';

@Module({
  imports: [FirewallProbeCoreModule, MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [FirewallProbeController],
})
export class FirewallProbeModule {}
