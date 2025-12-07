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
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface UniversityLogoData {
  uniName: string;
  logoURL: string;
}

const LOGO_DATA_URL = 'https://raw.githubusercontent.com/VNOI-Admin/uni-logo/refs/heads/master/data.json';
const LOGO_BASE_URL = 'https://raw.githubusercontent.com/VNOI-Admin/uni-logo/refs/heads/master/logo/';

@Injectable()
export class GroupService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Group.name)
    private groupModel: Model<GroupDocument>,
    private httpService: HttpService,
  ) {}

  async getGroups() {
    const groups = await this.groupModel.find().sort({ name: 1 }).lean();
    return groups.map((group) => new GroupEntity(group));
  }

  private async fetchLogoUrl(groupName: string): Promise<string | undefined> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<UniversityLogoData[]>(LOGO_DATA_URL)
      );

      const logoData = response.data;

      // Try exact match first
      let match = logoData.find(
        (item) => item.uniName.toLowerCase() === groupName.toLowerCase()
      );

      // If no exact match, try partial match
      if (!match) {
        match = logoData.find((item) =>
          item.uniName.toLowerCase().includes(groupName.toLowerCase()) ||
          groupName.toLowerCase().includes(item.uniName.toLowerCase())
        );
      }

      if (match) {
        return `${LOGO_BASE_URL}${match.logoURL}`;
      }

      return undefined;
    } catch (error) {
      // Log error but don't fail group creation
      console.error('Failed to fetch logo URL:', error);
      return undefined;
    }
  }

  async createGroup(createGroupDto: CreateGroupDto) {
    try {
      // Fetch logo URL
      const logoUrl = await this.fetchLogoUrl(createGroupDto.name);

      const group = await this.groupModel.create({
        code: createGroupDto.code,
        name: createGroupDto.name,
        logoUrl,
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
