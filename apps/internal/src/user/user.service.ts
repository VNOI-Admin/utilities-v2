import { CreateUserDto } from './dtos/createUser.dto';
import { UpdateUserDto } from './dtos/updateUser.dto';

import { Group, type GroupDocument } from '@libs/common-db/schemas/group.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { UserEntity } from '@libs/common/dtos/User.entity';
import { getErrorMessage } from '@libs/common/helper/error';
import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { Model, PipelineStage } from 'mongoose';
import { GetUsersDto } from './dtos/getUsers.dto';

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
      console.warn('Password for admin user is currently set to default. Please change it as soon as possible.');
    }
  }

  async getUsers(caller: string, query: GetUsersDto) {
    const { q, role, me, isActive, isOnline, orderBy } = query;

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

    return users.map((user) => new UserEntity(user));
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
      const user = await this.userModel.create({
        username: createUserDto.username,
        fullName: createUserDto.fullName,
        password: createUserDto.password,
        role: createUserDto.role,
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
    user.password = updateUserDto.password ?? user.password;
    user.role = updateUserDto.role ?? user.role;
    user.isActive = updateUserDto.isActive ?? user.isActive;

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
}
