import { FirewallProbeResult } from '@libs/common-db/schemas/firewallProbe.schema';
import { LuksRecovery } from '@libs/common-db/schemas/luksRecovery.schema';
import { Machine } from '@libs/common-db/schemas/machine.schema';
import { MachineNonce } from '@libs/common-db/schemas/machineNonce.schema';
import { RemoteControlScript } from '@libs/common-db/schemas/remoteControlScript.schema';
import { RemoteJob } from '@libs/common-db/schemas/remoteJob.schema';
import { RemoteJobRun } from '@libs/common-db/schemas/remoteJobRun.schema';
import { SystemConfig } from '@libs/common-db/schemas/systemConfig.schema';
import { Contest } from '@libs/common-db/schemas/contest.schema';
import { Group } from '@libs/common-db/schemas/group.schema';
import { Participant } from '@libs/common-db/schemas/participant.schema';
import { Problem } from '@libs/common-db/schemas/problem.schema';
import { Submission } from '@libs/common-db/schemas/submission.schema';
import { User } from '@libs/common-db/schemas/user.schema';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';

import { ClicsModule } from './clics/clics.module';
import { MachineModule } from './machine/machine.module';
import { SystemConfigModule } from './config/system-config.module';
import { FirewallProbeModule } from './firewall-probe/firewall-probe.module';
import { MachinesModule } from './machines/machines.module';
import { RemoteControlModule } from './remote-control/remote-control.module';

const models = [User, SystemConfig, RemoteControlScript, RemoteJob, RemoteJobRun, LuksRecovery, FirewallProbeResult, Machine, MachineNonce, Contest, Group, Participant, Problem, Submission];

describe.each([SystemConfigModule, RemoteControlModule, MachineModule, FirewallProbeModule, MachinesModule, ClicsModule])('%p', (feature) => {
  it('resolves the guards on its controller', async () => {
    let builder = Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), JwtModule.register({ global: true }), feature],
    });
    for (const model of models) builder = builder.overrideProvider(getModelToken(model.name)).useValue({});

    await expect(builder.compile()).resolves.toBeDefined();
  });
});
