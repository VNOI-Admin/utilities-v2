import {
  Group,
  type GroupDocument,
} from '@libs/common-db/schemas/group.schema';
import type { OnModuleInit } from '@nestjs/common';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';

import { GroupEntity } from '@libs/common/dtos/Group.entity';
import { UserEntity } from '@libs/common/dtos/User.entity';

@Injectable()
export class GroupService implements OnModuleInit {
  constructor(
    @InjectModel(Group.name)
    private groupModel: Model<GroupDocument>,
  ) {}

  async onModuleInit() {}

  async getGroups(): Promise<GroupEntity[]> {
    const groups = await this.groupModel.find().lean();
    return plainToInstance(GroupEntity, groups);
  }

  async getUsersInGroup(groupCodeName: string) {
    const group = await this.groupModel
      .findOne({ groupCodeName })
      .populate('members');
    if (!group) {
      throw new BadRequestException('Group not found');
    }

    const users = group.toObject().members;
    return plainToInstance(UserEntity, users);
  }
}
