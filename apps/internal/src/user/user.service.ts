import { CreateUserDto } from './dtos/createUser.dto';
import { UpdateUserDto } from './dtos/updateUser.dto';

import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import {
  Group,
  type GroupDocument,
} from '@libs/common-db/schemas/group.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity } from './entities/User.entity';
import * as argon2 from 'argon2';

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

  async createUser(createUserDto: CreateUserDto) {
    try {
      const user = await this.userModel.create({
        username: createUserDto.username,
        fullName: createUserDto.fullName,
        password: createUserDto.password,
        role: createUserDto.role,
      });
      return plainToInstance(UserEntity, user.toObject());
    } catch (error) {
      throw new BadRequestException(`Unable to create user: ${error.message}`);
    }
  }

  async updateUser(username: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel.findOne({ username });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.fullName = updateUserDto.fullName ?? user.fullName;
    user.password = updateUserDto.password ?? user.password;
    user.role = updateUserDto.role ?? user.role;
    user.username = updateUserDto.usernameNew || user.username;

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
    const updatedUser = await user.populate('group');
    return plainToInstance(UserEntity, updatedUser.toObject());
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
      throw new BadRequestException(error.message);
    }
  }
}
