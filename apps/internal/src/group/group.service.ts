import { CreateGroupDto } from './dtos/createGroup.dto';
import { UpdateGroupDto } from './dtos/updateGroup.dto';

import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import {
  Group,
  type GroupDocument,
} from '@libs/common-db/schemas/group.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GroupEntity } from './entities/Group.entity';

@Injectable()
export class GroupService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Group.name)
    private groupModel: Model<GroupDocument>,
  ) {}

  async createGroup(createGroupDto: CreateGroupDto) {
    try {
      const group = await this.groupModel.create({
        groupCodeName: createGroupDto.groupCodeName,
        groupFullName: createGroupDto.groupFullName,
      });

      await group.save();

      if (!group) {
        throw new BadRequestException('Unable to create group');
      }

      return plainToInstance(GroupEntity, group.toObject());
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async updateGroup(groupCodeName: string, updateGroupDto: UpdateGroupDto) {
    const group = await this.groupModel.findOne({ groupCodeName });
    if (!group) {
      throw new BadRequestException('Group not found');
    }

    group.groupCodeName = updateGroupDto.groupCodeName || group.groupCodeName;
    group.groupFullName = updateGroupDto.groupFullName || group.groupFullName;
    await group.save();
    return plainToInstance(GroupEntity, group.toObject());
  }

  async deleteGroup(groupCodeName: string) {
    try {
      const group = await this.groupModel.findOne({ groupCodeName });
      if (!group) {
        throw new BadRequestException('Group not found');
      }
      await this.userModel
        .updateMany({ group: group._id }, { $unset: { group: 1 } })
        .exec();
      await group.deleteOne();
      return {
        success: true,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
