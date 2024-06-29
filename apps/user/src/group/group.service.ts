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
import { plainToInstance } from 'class-transformer';
import type { PipelineStage } from 'mongoose';
import { Model } from 'mongoose';

import type { CreateGroupDto } from './dtos/createGroup.dto';
import { GroupEntity } from './entities/Group.entity';

@Injectable()
export class GroupService implements OnModuleInit {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Group.name)
    private groupModel: Model<GroupDocument>,
  ) {}

  async onModuleInit() {}

  async getGroups(): Promise<GroupEntity[]> {
    const groups = await this.groupModel.find().lean();
    return plainToInstance(GroupEntity, groups);
  }

  async createGroup(createGroupDto: CreateGroupDto) {
    const group = await this.groupModel.create({
      groupCodeName: createGroupDto.groupCodeName,
      groupFullName: createGroupDto.groupFullName,
    });

    await group.save();

    if (!group) {
      throw new BadRequestException('Unable to create group');
    }

    return plainToInstance(GroupEntity, group.toObject());
  }
}
