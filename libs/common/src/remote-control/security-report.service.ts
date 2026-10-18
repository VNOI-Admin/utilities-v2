import { RemoteJob } from '@libs/common-db/schemas/remoteJob.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { Role } from '@libs/common/decorators/role.decorator';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RemoteControlService } from './remote-control.service';

// Seeded from scripts/remote/security-report; returns the tails of the machine's
// aide.log/audit.log and the integrity-dirty marker through the job log.
export const SECURITY_REPORT_SCRIPT_NAME = 'security-report';

@Injectable()
export class SecurityReportService {
  constructor(
    private readonly remoteControlService: RemoteControlService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async runSecurityReport(createdBy: string, targets?: string[]): Promise<RemoteJob | null> {
    const resolved = targets?.length ? targets : await this.resolveFleetTargets();
    if (resolved.length === 0) return null;

    return this.remoteControlService.createJob(createdBy, {
      scriptName: SECURITY_REPORT_SCRIPT_NAME,
      targets: resolved,
    });
  }

  private async resolveFleetTargets(): Promise<string[]> {
    const users = await this.userModel
      .find({
        role: { $in: [Role.CONTESTANT, Role.GUEST] },
        isActive: true,
        vpnIpAddress: { $ne: null },
        'keyPair.privateKey': { $ne: null },
      })
      .select('username')
      .lean<{ username: string }[]>();
    return users.map((user) => user.username).sort();
  }
}
