import { LuksRecovery, LuksRecoverySchema } from '@libs/common-db/schemas/luksRecovery.schema';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LuksEscrowService } from './luks-escrow.service';
import { MachineHmacGuard } from './machine-auth.guard';
import { MachineController } from './machine.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LuksRecovery.name, schema: LuksRecoverySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [MachineController],
  providers: [MachineHmacGuard, LuksEscrowService],
})
export class MachineModule {}
