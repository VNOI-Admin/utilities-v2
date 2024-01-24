import type { OnModuleInit } from '@nestjs/common';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';

import type { GroupDocument } from '../database/schema/group.schema';
import { Group } from '../database/schema/group.schema';
import type { Role, UserDocument } from '../database/schema/user.schema';
import { User } from '../database/schema/user.schema';
import type { CreateGroupDto } from './dtos/createGroup.dto';
import type { CreateUserDto } from './dtos/createUser.dto';
import { GroupEntity } from './entities/Group.entity';
import { UserEntity } from './entities/User.entity';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Group.name)
    private groupModel: Model<GroupDocument>,
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

  async getUsers(): Promise<UserEntity[]> {
    const users = await this.userModel.find({ role: 'user' }).lean();
    return plainToInstance(UserEntity, users);
  }

  async getUser(username: string): Promise<UserEntity> {
    const user = await this.userModel.findOne({ username: username, role: 'user' }).lean();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return plainToInstance(UserEntity, user);
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
}
