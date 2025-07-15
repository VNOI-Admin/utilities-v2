import { CreateGroupDto } from './dtos/createGroup.dto';
import { UpdateGroupDto } from './dtos/updateGroup.dto';

import { Group, type GroupDocument } from '@libs/common-db/schemas/group.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { GroupEntity } from '@libs/common/dtos/Group.entity';
import { getErrorMessage } from '@libs/common/helper/error';
import { SUCCESS_RESPONSE } from '@libs/common/types/responses';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

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
        code: createGroupDto.code,
        name: createGroupDto.name,
      });

      await group.save();

      if (!group) {
        throw new BadRequestException('Unable to create group');
      }

      return new GroupEntity(group.toObject());
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async updateGroup(code: string, updateGroupDto: UpdateGroupDto) {
    const group = await this.groupModel.findOne({ code });
    if (!group) {
      throw new BadRequestException('Group not found');
    }

    group.code = updateGroupDto.code || group.code;
    group.name = updateGroupDto.name || group.name;
    await group.save();

    return new GroupEntity(group.toObject());
  }

  async deleteGroup(code: string) {
    try {
      const group = await this.groupModel.findOne({ code });
      if (!group) {
        throw new BadRequestException('Group not found');
      }
      await this.userModel.updateMany({ group: group._id }, { $unset: { group: 1 } }).exec();
      await group.deleteOne();
      return SUCCESS_RESPONSE;
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }
}
