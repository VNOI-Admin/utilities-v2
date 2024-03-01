import type { OnModuleInit } from '@nestjs/common';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { plainToInstance } from 'class-transformer';
import { FormData } from 'formdata-node';
import { Model } from 'mongoose';

import type { GroupDocument } from '../database/schema/group.schema';
import { Group } from '../database/schema/group.schema';
import type { Role, UserDocument } from '../database/schema/user.schema';
import { User } from '../database/schema/user.schema';
import type { CreateGroupDto } from './dtos/createGroup.dto';
import type { CreateUserBatchDto, CreateUserDto } from './dtos/createUser.dto';
import type { GetUserDto } from './dtos/getUser.dto';
import type { ReportUsageDto } from './dtos/reportUsage.dto';
import type { UpdateUserBatchDto, UpdateUserDto } from './dtos/updateUser.dto';
import { GroupEntity } from './entities/Group.entity';
import { UserEntity } from './entities/User.entity';

@Injectable()
export class UserService implements OnModuleInit {
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
      console.warn(
        'Password for admin user is currently set to default. Please change it as soon as possible.',
      );
    }
  }

  async checkPrivilege(userId: string, roles: Role[]): Promise<void> {
    const user = await this.userModel.findOne({ _id: userId }).lean();

    if (!user || !roles.includes(user.role)) {
      throw new UnauthorizedException();
    }
  }

  async createUser(createUserDto: CreateUserDto) {
    const user = await this.userModel.create({
      username: createUserDto.username,
      fullName: createUserDto.fullName,
      password: createUserDto.password,
      role: createUserDto.role,
    });

    user.save();

    if (!user) {
      throw new BadRequestException('Unable to create user');
    }

    return plainToInstance(UserEntity, user.toObject());
  }

  async createUserBatch(createUserDto: CreateUserBatchDto) {
    console.log(createUserDto);
    const users: UserEntity[] = [];
    for (const user of createUserDto.users) {
      try {
        users.push(await this.createUser(user));
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }
      }
    }
    return plainToInstance(UserEntity, users);
  }

  async getUsers(query: GetUserDto): Promise<UserEntity[]> {
    const q = query.q;
    const users = await this.userModel.aggregate([
      {
        $match: {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { fullName: { $regex: q, $options: 'i' } },
          ],
        },
      },
      { $match: { role: 'user' } },
      { $match: { isActive: true } },
    ]);

    return plainToInstance(UserEntity, users);
  }

  async getUser(username: string): Promise<UserEntity> {
    const user = await this.userModel.findOne({ username: username, role: 'user' }).lean();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return plainToInstance(UserEntity, user);
  }

  async getUserById(userId: string): Promise<UserEntity> {
    const user = await this.userModel.findOne({ _id: userId }).lean();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return plainToInstance(UserEntity, user);
  }

  async getUserByIp(ipAddress: string): Promise<string> {
    const user = await this.userModel.findOne({ vpnIpAddress: ipAddress }).lean();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return user._id.toString();
  }

  async getGroups(): Promise<GroupEntity[]> {
    const groups = await this.groupModel.find().lean();
    return plainToInstance(GroupEntity, groups);
  }

  async createGroup(createGroupDto: CreateGroupDto) {
    const group = await this.groupModel.create({
      groupCodeName: createGroupDto.groupCodeName,
      groupFullName: createGroupDto.groupFullName,
    });

    group.save();

    if (!group) {
      throw new BadRequestException('Unable to create group');
    }

    return plainToInstance(GroupEntity, group.toObject());
  }

  async updateUser(updateUserDto: UpdateUserDto) {
    const user = await this.userModel.findOne({ username: updateUserDto.username });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    // user.username = updateUserDto.username;
    user.fullName = updateUserDto.fullName || user.fullName;
    user.password = updateUserDto.password || user.password;
    user.role = updateUserDto.role || user.role;
    user.username = updateUserDto.usernameNew || user.username;
    user.save();
    return plainToInstance(UserEntity, user.toObject());
  }

  async updateUserBatch(updateUserDto: UpdateUserBatchDto) {
    const users: UserEntity[] = [];
    for (const user of updateUserDto.users) {
      try {
        users.push(await this.updateUser(user));
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }
      }
    }
    return plainToInstance(UserEntity, users);
  }

  async reportUsage(userId: string, usage: ReportUsageDto) {
    const user = await this.userModel.findOne({ _id: userId });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    user.machineUsage.cpu = usage.cpu;
    user.machineUsage.memory = usage.memory;
    user.machineUsage.disk = usage.disk;
    user.machineUsage.lastReportedAt = new Date();
    user.save();
  }

  async print(callerId: string, file: Express.Multer.File) {
    const user = await this.userModel.findOne({ _id: callerId }).lean();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const username = user.username;

    const filename = `${username}-${file.originalname}`;

    const formData = new FormData();
    const fileBuffer = new Blob([file.buffer], { type: file.mimetype });
    formData.append('file', fileBuffer, filename);

    // print formdata file content
    try {
      const response = await fetch(`${this.printUrl}/print`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new BadRequestException('Unable to print');
      }
    } catch (error) {
      throw new BadRequestException('Unable to print');
    }
  }
}
