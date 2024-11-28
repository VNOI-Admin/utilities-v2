import { CreateUserDto } from './dtos/createUser.dto';
import { UpdateUserDto } from './dtos/updateUser.dto';

import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import {
  Group,
  type GroupDocument,
} from '@libs/common-db/schemas/group.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity } from './entities/User.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Group.name)
    private groupModel: Model<GroupDocument>,
  ) {}

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
}
