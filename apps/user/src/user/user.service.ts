import type { Role } from '@libs/common/decorators/role.decorator';
import {
  Group,
  type GroupDocument,
} from '@libs/common-db/schemas/group.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import type { PipelineStage } from 'mongoose';
import { Model } from 'mongoose';

import type { GetUserDto } from './dtos/getUser.dto';
import { MachineUsageEntity, UserEntity } from '@libs/common/dtos/User.entity';

@Injectable()
export class UserService {
  private printUrl: string;
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Group.name)
    private groupModel: Model<GroupDocument>,
  ) {
    this.printUrl = this.configService.get('PRINTER_URL');
  }

  async checkPrivilege(userId: string, roles: Role[]): Promise<void> {
    const user = await this.userModel.findOne({ _id: userId }).lean();

    if (!user || !roles.includes(user.role)) {
      throw new UnauthorizedException();
    }
  }

  async getUsers(query: GetUserDto): Promise<UserEntity[]> {
    const q = query.q || '';
    const orderBy = query.orderBy || { username: 1 };

    const pipeline: PipelineStage[] = [
      {
        $match: {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { fullName: { $regex: q, $options: 'i' } },
          ],
        },
      },
      { $match: { isActive: true } },
    ];

    if (query.role) {
      pipeline.push({ $match: { role: query.role } });
    }

    const users = await this.userModel.aggregate([
      ...pipeline,
      { $sort: orderBy },
      {
        $lookup: {
          from: 'groups',
          localField: 'group',
          foreignField: '_id',
          as: 'group',
        },
      },
      {
        $set: {
          group: { $first: '$group' },
        },
      },
    ]);

    return users.map((user) => plainToInstance(UserEntity, user));
  }

  async getUserByUsername(username: string): Promise<UserEntity> {
    const user = await this.userModel
      .findOne({ username: username })
      .populate('group')
      .lean();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return plainToInstance(UserEntity, user);
  }

  async getUserById(userId: string): Promise<UserEntity> {
    const user = await this.userModel
      .findOne({ _id: userId })
      .populate('group')
      .lean();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return plainToInstance(UserEntity, user);
  }

  async getUserByIp(ipAddress: string): Promise<string> {
    const user = await this.userModel
      .findOne({ vpnIpAddress: ipAddress })
      .lean();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return user._id.toString();
  }

  async getMachineUsage(username: string): Promise<MachineUsageEntity> {
    const user = await this.userModel.findOne({ username: username }).lean();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return plainToInstance(MachineUsageEntity, user.machineUsage);
  }
}
