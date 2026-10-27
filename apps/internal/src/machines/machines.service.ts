import { Machine, type MachineDocument, MachineStatus } from '@libs/common-db/schemas/machine.schema';
import {
  CONTESTANT_LOGIN_LOCKED_UNTIL_CONFIG_KEY,
  SystemConfig,
  type SystemConfigDocument,
} from '@libs/common-db/schemas/systemConfig.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { machineCode, machineFingerprint, normalizeMachineCode } from '@libs/common/machine/machine-auth';
import { MachineAuthService } from '@libs/common/machine/machine-auth.service';
import { machineName, nextFreeName } from '@libs/common/machine/machine-name';
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

const MAX_NAME_LENGTH = 32;

const status = (machine: Machine) => ({ code: machine.code, status: machine.status });

const isDuplicateKey = (error: unknown) => (error as { code?: number })?.code === 11000;

@Injectable()
export class MachinesService {
  constructor(
    @InjectModel(Machine.name)
    private machineModel: Model<MachineDocument>,
    private machineAuth: MachineAuthService,
    @InjectModel(SystemConfig.name)
    private systemConfigModel: Model<SystemConfigDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
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
    return { ...status(machine), name: machine.name ?? null, lockedUntil: await this.contestantLoginLockedUntil() };
  }

  private async contestantLoginLockedUntil(): Promise<string | null> {
    const config = await this.systemConfigModel.findOne({ key: CONTESTANT_LOGIN_LOCKED_UNTIL_CONFIG_KEY }).lean();
    if (!config?.value) return null;
    const until = new Date(String(config.value));
    return until.getTime() > Date.now() ? until.toISOString() : null;
  }

  async challenge() {
    return { nonce: await this.machineAuth.issueNonce() };
  }

  async list() {
    const machines = await this.machineModel.find().sort({ createdAt: -1 }).lean<Machine[]>();
    const guests = await this.userModel
      .find({ machine: { $in: machines.map((m) => m.fingerprint) } })
      .select('username vpnIpAddress machine machineUsage.isOnline')
      .lean<User[]>();
    const byMachine = new Map(
      guests.map((g) => [
        g.machine,
        { username: g.username, vpnIpAddress: g.vpnIpAddress, isOnline: g.machineUsage?.isOnline ?? false },
      ]),
    );
    return machines.map((m) => ({ ...m, guest: byMachine.get(m.fingerprint) ?? null }));
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

    return this.markApproved(waiting[0], admin);
  }

  async approveFingerprint(fingerprint: string, admin: string) {
    const machine = await this.machineModel.findOne({ fingerprint }).lean<Machine>();
    if (!machine) {
      throw new NotFoundException('Machine not found');
    }
    if (machine.status === MachineStatus.APPROVED && machine.name) {
      return machine;
    }
    return this.markApproved(machine, admin);
  }

  private async markApproved(machine: Machine, admin: string) {
    const approval =
      machine.status === MachineStatus.APPROVED
        ? {}
        : { status: MachineStatus.APPROVED, approvedBy: admin, approvedAt: new Date() };

    // Another approval can take the same free name between the lookup and the write; the unique index catches it.
    for (let attempt = 1; ; attempt++) {
      const name = machine.name ?? (await this.freeName(machine.fingerprint));
      try {
        return await this.machineModel
          .findOneAndUpdate({ fingerprint: machine.fingerprint }, { $set: { ...approval, name } }, { new: true })
          .lean();
      } catch (error) {
        if (!isDuplicateKey(error) || machine.name || attempt >= 5) throw error;
      }
    }
  }

  private async freeName(fingerprint: string) {
    const base = machineName(fingerprint);
    const taken = await this.machineModel
      .find({ name: new RegExp(`^${base}(-\\d+)?$`) })
      .select('name')
      .lean<Machine[]>();
    return nextFreeName(
      base,
      taken.map((m) => m.name as string),
    );
  }

  async rename(fingerprint: string, input: unknown) {
    const name = typeof input === 'string' ? input.trim() : '';
    if (!name || name.length > MAX_NAME_LENGTH || /\p{C}/u.test(name)) {
      throw new BadRequestException(
        `Name must be 1-${MAX_NAME_LENGTH} characters with no control or invisible formatting characters`,
      );
    }

    try {
      const machine = await this.machineModel
        .findOneAndUpdate({ fingerprint }, { $set: { name } }, { new: true })
        .lean();
      if (!machine) {
        throw new NotFoundException('Machine not found');
      }
      return machine;
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new ConflictException(`Another machine is already named ${name}`);
      }
      throw error;
    }
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
