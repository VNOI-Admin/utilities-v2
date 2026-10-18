import { FirewallProbeResult, FirewallProbeResultSchema } from '@libs/common-db/schemas/firewallProbe.schema';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FirewallProbeService } from './firewall-probe.service';
import { PORT_PROBE, probeTcpPort } from './tcp-probe';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: FirewallProbeResult.name, schema: FirewallProbeResultSchema },
    ]),
  ],
  providers: [FirewallProbeService, { provide: PORT_PROBE, useValue: probeTcpPort }],
  exports: [FirewallProbeService],
})
export class FirewallProbeCoreModule {}
