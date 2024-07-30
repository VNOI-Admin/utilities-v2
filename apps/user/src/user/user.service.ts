import type { Role } from '@libs/common/decorators/role.decorator';
import {
  Group,
  type GroupDocument,
} from '@libs/common-db/schemas/group.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import type { OnModuleInit } from '@nestjs/common';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { plainToInstance } from 'class-transformer';
import { FormData } from 'formdata-node';
import type { PipelineStage } from 'mongoose';
import { Model } from 'mongoose';

import type { CreateUserDto } from './dtos/createUser.dto';
import type { GetUserDto } from './dtos/getUser.dto';
import type { ReportUsageDto } from './dtos/reportUsage.dto';
import type { UpdateUserDto } from './dtos/updateUser.dto';
import { MachineUsageEntity, UserEntity } from './entities/User.entity';

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

  async getUsers(query: GetUserDto): Promise<UserEntity[]> {
    const q = query.q || '';
    const orderBy = query.orderBy || { username: 1 };

    console.log('Query', query);

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

    return plainToInstance(UserEntity, users);
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

  async updateUser(username: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel.findOne({ username });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if ('group' in updateUserDto) {
      // Find new group document
      let newGroup = undefined;
      if (updateUserDto.group !== '') {
        newGroup = await this.groupModel.findOne({
          groupCodeName: updateUserDto.group,
        });
        if (!newGroup) throw new BadRequestException('Group not found');
      }

      // Update if there's a change
      if (newGroup?._id != user.group?._id) {
        // Remove user from old group
        if (user.group) {
          const oldGroup = await this.groupModel.findOne({ _id: user.group });
          if (oldGroup)
            await oldGroup
              .updateOne({
                $pull: { members: user._id },
              })
              .exec();
        }

        // Add user to new group
        if (newGroup)
          await newGroup.updateOne({ $addToSet: { members: user._id } }).exec();
        // Set user's new group
        user.group = newGroup?._id;
      }
    }

    user.fullName = updateUserDto.fullName || user.fullName;
    user.password = updateUserDto.password || user.password;
    user.role = updateUserDto.role || user.role;
    user.username = updateUserDto.usernameNew || user.username;

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

  async getMachineUsage(username: string): Promise<MachineUsageEntity> {
    const user = await this.userModel.findOne({ username: username }).lean();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return plainToInstance(MachineUsageEntity, user.machineUsage);
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
    await user.save();
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
