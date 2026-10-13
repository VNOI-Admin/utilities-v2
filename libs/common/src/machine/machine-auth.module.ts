import { Machine, MachineSchema } from '@libs/common-db/schemas/machine.schema';
import { MachineNonce, MachineNonceSchema } from '@libs/common-db/schemas/machineNonce.schema';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MachineGuard } from '../guards/machine.guard';
import { MachineAuthService } from './machine-auth.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Machine.name, schema: MachineSchema },
      { name: MachineNonce.name, schema: MachineNonceSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [MachineAuthService, MachineGuard],
  exports: [MachineAuthService, MachineGuard, MongooseModule],
})
export class MachineAuthModule {}
