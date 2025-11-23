import { CreateUserDto } from './dtos/createUser.dto';
import { UpdateUserDto } from './dtos/updateUser.dto';

import { Group, type GroupDocument } from '@libs/common-db/schemas/group.schema';
import { MachineUsage, User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { Role } from '@libs/common/decorators/role.decorator';
import { UserEntity } from '@libs/common/dtos/User.entity';
import { getErrorMessage } from '@libs/common/helper/error';
import { generateKeyPair } from '@libs/utils/crypto/keygen';
import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import * as ip from 'ip';
import { Model, PipelineStage } from 'mongoose';
import { GetUsersDto } from './dtos/getUsers.dto';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Group.name)
    private groupModel: Model<GroupDocument>,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    let admin = await this.userModel.findOne({ username: 'admin' });
    if (!admin) {
      console.log('Initializing admin user...');
      admin = await this.userModel.create({
        username: 'admin',
        password: 'admin',
        role: 'admin',
        isActive: true,
        refreshToken: null,
      });
    }
    const defaultPasswordCheck = await argon2.verify(admin.password, 'admin');
    if (defaultPasswordCheck) {
      console.warn('Password for admin user is currently set to default. Please change it as soon as possible.');
    }
  }

  async getUsers(caller: string, query: GetUsersDto) {
    const { q, role, me, isActive, isOnline, orderBy, withStream } = query;

    const pipeline: PipelineStage[] = [];

    if (q) {
      pipeline.push({
        $match: {
          $or: [{ username: { $regex: q, $options: 'i' } }, { fullName: { $regex: q, $options: 'i' } }],
        },
      });
    }

    if (role) {
      pipeline.push({
        $match: {
          role,
        },
      });
    }

    if (me) {
      pipeline.push({
        $match: {
          username: caller,
        },
      });
    }

    if (isActive !== undefined) {
      pipeline.push({
        $match: {
          isActive,
        },
      });
    }

    if (isOnline !== undefined) {
      pipeline.push({
        $match: {
          'machineUsage.isOnline': isOnline,
        },
      });
    }

    if (orderBy) {
      for (const [key, value] of Object.entries(orderBy)) {
        pipeline.push({
          $sort: {
            [key]: value,
          },
        });
      }
    } else {
      pipeline.push({
        $sort: {
          createdAt: -1,
        },
      });
    }

    const users = await this.userModel.aggregate(pipeline).exec();

    const livestreamProxy = this.configService.get('LIVESTREAM_PROXY_URL');

    return users.map((user) => {
      const userEntity = new UserEntity(user);

      // Add stream URLs if requested
      if (withStream && user.vpnIpAddress && livestreamProxy) {
        userEntity.streamUrl = `${livestreamProxy}/${user.vpnIpAddress}/stream.m3u8`;
        userEntity.webcamUrl = `${livestreamProxy}/${user.vpnIpAddress}/webcam.m3u8`;
      }

      return userEntity;
    });
  }

  async getUser(username: string) {
    const user = await this.userModel
      .findOne({
        username,
      })
      .lean();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return new UserEntity(user);
  }

  async createUser(createUserDto: CreateUserDto) {
    try {
      // Hash the password
      const hashedPassword = await argon2.hash(createUserDto.password);

      // Assign VPN IP address
      const vpnIpAddress = await this.assignVpnIpAddress(createUserDto.role);

      // Generate key pair
      const keyPair = generateKeyPair();

      const user = await this.userModel.create({
        username: createUserDto.username,
        fullName: createUserDto.fullName,
        password: hashedPassword,
        role: createUserDto.role,
        vpnIpAddress,
        keyPair,
        machineUsage: new MachineUsage(),
        isActive: createUserDto.isActive ?? true,
      });

      return new UserEntity(user.toObject());
    } catch (error) {
      throw new BadRequestException(`Unable to create user: ${getErrorMessage(error)}`);
    }
  }

  async updateUser(username: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel.findOne({ username });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.fullName = updateUserDto.fullName ?? user.fullName;
    user.isActive = updateUserDto.isActive ?? user.isActive;

    // Hash password if it's being updated
    if (updateUserDto.password) {
      user.password = await argon2.hash(updateUserDto.password);
    }

    // If role is being changed, reassign VPN IP and generate new key pair
    if (updateUserDto.role && updateUserDto.role !== user.role) {
      user.role = updateUserDto.role;
      user.vpnIpAddress = await this.assignVpnIpAddress(updateUserDto.role);
      user.keyPair = generateKeyPair();
    }

    if (updateUserDto.group) {
      const group = await this.groupModel.findOne({
        code: updateUserDto.group,
      });

      if (!group) {
        throw new BadRequestException('Group not found');
      }

      user.group = group.code;
    }

    await user.save();

    return new UserEntity(user);
  }

  async deleteUser(username: string) {
    try {
      const user = await this.userModel.findOne({ username });
      if (!user) {
        throw new BadRequestException('User not found');
      }
      await user.deleteOne();
      return {
        success: true,
      };
    } catch (error) {
      throw new BadRequestException(`Unable to delete user: ${getErrorMessage(error)}`);
    }
  }

  private async assignVpnIpAddress(role: Role): Promise<string> {
    const users = await this.userModel.find({ role }).exec();

    let vpnBaseSubnet: number;

    switch (role) {
      case Role.CONTESTANT:
        vpnBaseSubnet = ip.toLong(this.configService.get('WG_CONTESTANT_BASE_SUBNET') as string);
        break;
      case Role.COACH:
        vpnBaseSubnet = ip.toLong(this.configService.get('WG_COACH_BASE_SUBNET') as string);
        break;
      case Role.ADMIN:
        vpnBaseSubnet = ip.toLong(this.configService.get('WG_ADMIN_BASE_SUBNET') as string);
        break;
      default:
        throw new Error('Invalid role');
    }

    const ipAddresses = users.map((user) => ip.toLong(user.vpnIpAddress));

    for (let i = 1; i <= users.length + 1; i++) {
      if (!ipAddresses.includes(vpnBaseSubnet + i)) {
        return ip.fromLong(vpnBaseSubnet + i);
      }
    }

    throw new Error('Unable to assign VPN IP address');
  }
}
