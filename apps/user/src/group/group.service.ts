import { Group, type GroupDocument } from '@libs/common-db/schemas/group.schema';
import type { OnModuleInit } from '@nestjs/common';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';

import { User, UserDocument } from '@libs/common-db/schemas/user.schema';
import { GroupEntity } from '@libs/common/dtos/Group.entity';
import { UserEntity } from '@libs/common/dtos/User.entity';

@Injectable()
export class GroupService implements OnModuleInit {
  constructor(
    @InjectModel(Group.name)
    private groupModel: Model<GroupDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {}

  async getGroups(): Promise<GroupEntity[]> {
    const groups = await this.groupModel.find().lean();
    return plainToInstance(GroupEntity, groups);
  }

  async getUsersInGroup(code: string) {
    const group = await this.groupModel.findOne({ code });
    if (!group) {
      throw new BadRequestException('Group not found');
    }

    const users = await this.userModel.find({ group: group.code }).lean();
    return plainToInstance(UserEntity, users);
  }
}
