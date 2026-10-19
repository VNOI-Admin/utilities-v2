import { Machine, type MachineDocument, MachineStatus } from '@libs/common-db/schemas/machine.schema';
import { machineCode, machineFingerprint, normalizeMachineCode } from '@libs/common/machine/machine-auth';
import { MachineAuthService } from '@libs/common/machine/machine-auth.service';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { EnrollMachineDto } from './dtos/enrollMachine.dto';

// A venue sits behind one NAT address, so this only stops floods, not a room booting at once.
const ENROLLS_PER_IP_PER_MINUTE = 300;

const status = (machine: Machine) => ({ code: machine.code, status: machine.status });

@Injectable()
export class MachinesService {
  constructor(
    @InjectModel(Machine.name)
    private machineModel: Model<MachineDocument>,
    private machineAuth: MachineAuthService,
  ) {}

  async enroll(dto: EnrollMachineDto, ip: string) {
    const publicKey = Buffer.from(dto.publicKey, 'base64');
    const fingerprint = machineFingerprint(publicKey);

    const known = await this.machineModel.findOne({ fingerprint }).lean<Machine>();
    if (known) {
      return status(known);
    }

    const recent = await this.machineModel.countDocuments({
      enrollIp: ip,
      createdAt: { $gte: new Date(Date.now() - 60_000) },
    });
    if (recent >= ENROLLS_PER_IP_PER_MINUTE) {
      throw new HttpException('Too many enrollments; try again in a minute.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const machine = await this.machineModel
      .findOneAndUpdate(
        { fingerprint },
        {
          $setOnInsert: {
            fingerprint,
            publicKey: dto.publicKey,
            code: machineCode(publicKey),
            hostname: dto.hostname,
            enrollIp: ip,
          },
        },
        { upsert: true, new: true },
      )
      .lean<Machine>();
    return status(machine!);
  }

  async me(req: unknown) {
    const machine = await this.machineAuth.authenticate(req);
    if (!machine) {
      throw new NotFoundException('Unknown machine');
    }
    return status(machine);
  }

  async challenge() {
    return { nonce: await this.machineAuth.issueNonce() };
  }

  list() {
    return this.machineModel.find().sort({ createdAt: -1 }).lean();
  }

  async approve(input: string, admin: string) {
    const code = normalizeMachineCode(input);
    if (!code) {
      throw new BadRequestException('Invalid machine code');
    }

    const waiting = await this.machineModel
      .find({ code, status: { $ne: MachineStatus.APPROVED } })
      .limit(2)
      .lean<Machine[]>();
    if (waiting.length === 0) {
      throw new NotFoundException('No machine is waiting for approval with this code');
    }
    if (waiting.length > 1) {
      throw new ConflictException('Ambiguous code: several machines show it; re-enroll one of them');
    }

    return this.machineModel
      .findOneAndUpdate(
        { fingerprint: waiting[0].fingerprint },
        { $set: { status: MachineStatus.APPROVED, approvedBy: admin, approvedAt: new Date() } },
        { new: true },
      )
      .lean();
  }

  async revoke(fingerprint: string) {
    const machine = await this.machineModel
      .findOneAndUpdate(
        { fingerprint },
        { $set: { status: MachineStatus.REVOKED, revokedAt: new Date() } },
        { new: true },
      )
      .lean();
    if (!machine) {
      throw new NotFoundException('Machine not found');
    }
    return machine;
  }

  async remove(fingerprint: string) {
    const { deletedCount } = await this.machineModel.deleteOne({ fingerprint });
    if (!deletedCount) {
      throw new NotFoundException('Machine not found');
    }
    return { success: true };
  }
}
