import { CreateUserDto } from './dtos/createUser.dto';
import { UpdateUserDto } from './dtos/updateUser.dto';
import { BatchCreateUsersDto } from './dtos/batchCreateUsers.dto';
import { BatchCreateUsersResponseDto, BatchUserResultDto } from './dtos/batchCreateUsersResponse.dto';
import { BulkDeleteUsersDto, BulkDeleteUsersResponseDto } from './dtos/bulkDeleteUsers.dto';

import { Group, type GroupDocument } from '@libs/common-db/schemas/group.schema';
import { MachineUsage, User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { Role } from '@libs/common/decorators/role.decorator';
import { UserEntity } from '@libs/common/dtos/User.entity';
import { getErrorMessage } from '@libs/common/helper/error';
import { generateKeyPair } from '@libs/utils/crypto/keygen';
import { BadRequestException, Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import * as ip from 'ip';
import { Model, PipelineStage } from 'mongoose';
import { GetUsersDto } from './dtos/getUsers.dto';
import { GroupService } from '../group/group.service';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Group.name)
    private groupModel: Model<GroupDocument>,
    private configService: ConfigService,
    @Inject(forwardRef(() => GroupService))
    private groupService: GroupService,
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
    const { q, role, me, isActive, isOnline, orderBy, withStream, group } = query;

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

    if (group) {
      pipeline.push({
        $match: {
          group,
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

    const livestreamProxy = this.configService.get('LIVESTREAM_PROXY_URL');

    return users.map((user) => {
      const userEntity = new UserEntity(user);

      // Add stream URLs if requested
      if (withStream && user.vpnIpAddress && livestreamProxy) {
        userEntity.streamUrl = `${livestreamProxy}/${user.vpnIpAddress}/stream.m3u8`;
        userEntity.webcamUrl = `${livestreamProxy}/${user.vpnIpAddress}/webcam.m3u8`;
      }

      return userEntity;
    });
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
      // Hash the password
      const hashedPassword = await argon2.hash(createUserDto.password);

      // Assign VPN IP address
      const vpnIpAddress = await this.assignVpnIpAddress(createUserDto.role);

      // Generate key pair
      const keyPair = generateKeyPair();

      // Validate group if provided
      let validatedGroup: string | undefined;
      if (createUserDto.group) {
        const group = await this.groupModel.findOne({
          code: createUserDto.group,
        });

        if (!group) {
          throw new BadRequestException('Group not found');
        }

        validatedGroup = group.code;
      }

      const user = await this.userModel.create({
        username: createUserDto.username,
        fullName: createUserDto.fullName,
        password: hashedPassword,
        role: createUserDto.role,
        vpnIpAddress,
        keyPair,
        machineUsage: new MachineUsage(),
        isActive: createUserDto.isActive ?? true,
        group: validatedGroup,
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
    user.isActive = updateUserDto.isActive ?? user.isActive;

    // Hash password if it's being updated
    if (updateUserDto.password) {
      user.password = await argon2.hash(updateUserDto.password);
    }

    // If role is being changed, reassign VPN IP and generate new key pair
    if (updateUserDto.role && updateUserDto.role !== user.role) {
      user.role = updateUserDto.role;
      user.vpnIpAddress = await this.assignVpnIpAddress(updateUserDto.role);
      user.keyPair = generateKeyPair();
    }

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

  async bulkDeleteUsers(dto: BulkDeleteUsersDto): Promise<BulkDeleteUsersResponseDto> {
    // Build filter query - requires text search to prevent accidental mass deletion
    const filter: Record<string, unknown> = {
      $or: [
        { username: { $regex: dto.q, $options: 'i' } },
        { fullName: { $regex: dto.q, $options: 'i' } },
      ],
      // Never delete the admin user
      username: { $ne: 'admin' },
    };

    if (dto.role) {
      filter.role = dto.role;
    }

    if (dto.group) {
      filter.group = dto.group;
    }

    if (dto.isActive !== undefined) {
      filter.isActive = dto.isActive;
    }

    // Find matching users first
    const usersToDelete = await this.userModel.find(filter).exec();
    const deletedUsernames = usersToDelete.map((u) => u.username);

    // Delete the users
    const result = await this.userModel.deleteMany(filter).exec();

    return new BulkDeleteUsersResponseDto({
      deletedCount: result.deletedCount ?? 0,
      deletedUsernames,
    });
  }

  /**
   * Converts a group name to a code format
   * Example: "University of Science" -> "university-of-science"
   */
  private generateGroupCode(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Finds or creates a group by name
   * Returns the group code for use in user creation
   * Uses GroupService.createGroup to auto-fetch logo URL for new groups
   */
  async findOrCreateGroupByName(groupName: string): Promise<{
    code: string;
    wasCreated: boolean;
  }> {
    // First try to find by name (case-insensitive)
    let group = await this.groupModel.findOne({
      name: { $regex: new RegExp(`^${groupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (group) {
      return { code: group.code, wasCreated: false };
    }

    // Generate code from name
    const code = this.generateGroupCode(groupName);

    // Check if code already exists (edge case)
    group = await this.groupModel.findOne({ code });
    if (group) {
      return { code: group.code, wasCreated: false };
    }

    // Create new group using GroupService (which fetches logo URL)
    const newGroup = await this.groupService.createGroup({
      code,
      name: groupName,
    });

    return { code: newGroup.code, wasCreated: true };
  }

  async batchCreateUsers(dto: BatchCreateUsersDto): Promise<BatchCreateUsersResponseDto> {
    const results: BatchUserResultDto[] = [];
    const autoCreatedGroups: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Step 1: Pre-process groups - collect unique group names and resolve them
    const uniqueGroupNames = [
      ...new Set(
        dto.users.filter((u) => u.groupName).map((u) => u.groupName!),
      ),
    ];

    const groupNameToCode = new Map<string, string>();

    for (const groupName of uniqueGroupNames) {
      try {
        const { code, wasCreated } = await this.findOrCreateGroupByName(groupName);
        groupNameToCode.set(groupName.toLowerCase(), code);
        if (wasCreated) {
          autoCreatedGroups.push(groupName);
        }
      } catch (error) {
        console.error(`Failed to create/find group "${groupName}":`, getErrorMessage(error));
      }
    }

    // Step 2: Create users one by one
    for (const userItem of dto.users) {
      try {
        // Check for duplicate username in same batch
        const existingInBatch = results.find((r) => r.success && r.username === userItem.username);
        if (existingInBatch) {
          results.push(
            new BatchUserResultDto({
              username: userItem.username,
              success: false,
              error: 'Duplicate username in batch',
            }),
          );
          failureCount++;
          continue;
        }

        // Resolve group code if group name provided
        let groupCode: string | undefined;
        if (userItem.groupName) {
          groupCode = groupNameToCode.get(userItem.groupName.toLowerCase());
          if (!groupCode) {
            results.push(
              new BatchUserResultDto({
                username: userItem.username,
                success: false,
                error: `Failed to resolve group: ${userItem.groupName}`,
              }),
            );
            failureCount++;
            continue;
          }
        }

        // Hash password
        const hashedPassword = await argon2.hash(userItem.password);

        // Assign VPN IP
        const vpnIpAddress = await this.assignVpnIpAddress(dto.role);

        // Generate key pair
        const keyPair = generateKeyPair();

        // Create user
        const user = await this.userModel.create({
          username: userItem.username,
          fullName: userItem.fullName,
          password: hashedPassword,
          role: dto.role,
          vpnIpAddress,
          keyPair,
          machineUsage: new MachineUsage(),
          isActive: true,
          group: groupCode,
        });

        results.push(
          new BatchUserResultDto({
            username: userItem.username,
            success: true,
            user: new UserEntity(user.toObject()),
          }),
        );
        successCount++;
      } catch (error) {
        results.push(
          new BatchUserResultDto({
            username: userItem.username,
            success: false,
            error: getErrorMessage(error) || 'Unknown error',
          }),
        );
        failureCount++;
      }
    }

    return new BatchCreateUsersResponseDto({
      total: dto.users.length,
      successCount,
      failureCount,
      results,
      autoCreatedGroups,
    });
  }

  private async assignVpnIpAddress(role: Role): Promise<string> {
    const users = await this.userModel.find({ role }).exec();

    let vpnBaseSubnet: number;

    switch (role) {
      case Role.CONTESTANT:
        vpnBaseSubnet = ip.toLong(this.configService.get('WG_CONTESTANT_BASE_SUBNET') as string);
        break;
      case Role.COACH:
        vpnBaseSubnet = ip.toLong(this.configService.get('WG_COACH_BASE_SUBNET') as string);
        break;
      case Role.ADMIN:
        vpnBaseSubnet = ip.toLong(this.configService.get('WG_ADMIN_BASE_SUBNET') as string);
        break;
      case Role.GUEST:
        vpnBaseSubnet = ip.toLong(this.configService.get('WG_GUEST_BASE_SUBNET') as string);
        break;
      default:
        throw new Error('Invalid role');
    }

    const ipAddresses = users.map((user) => ip.toLong(user.vpnIpAddress));

    for (let i = 1; i <= users.length + 1; i++) {
      if (!ipAddresses.includes(vpnBaseSubnet + i)) {
        return ip.fromLong(vpnBaseSubnet + i);
      }
    }

    throw new Error('Unable to assign VPN IP address');
  }
}
