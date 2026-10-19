import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { MACHINE_BOUND_ROLES } from '../machine/machine-auth';
import { MachineAuthService } from '../machine/machine-auth.service';

// Place after the user guards: contestants, guests and anonymous callers must come from an approved machine.
@Injectable()
export class MachineGuard implements CanActivate {
  constructor(
    private machineAuth: MachineAuthService,

    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const machine = await this.machineAuth.approvedMachine(request);
    if (machine) {
      request['machine'] = machine.fingerprint;
      return true;
    }

    if (!this.machineAuth.required()) {
      return true;
    }

    // IPAddressGuard leaves the username, AccessTokenGuard the token payload.
    const username = typeof request['user'] === 'string' ? request['user'] : request['user']?.sub;
    const user = username ? await this.userModel.findOne({ username }).select('role').lean() : null;
    if (user && !MACHINE_BOUND_ROLES.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException('machine not approved');
  }
}
