import { RequiredRoles, Role } from "@libs/common/decorators/role.decorator";
import { AccessTokenGuard } from "@libs/common/guards/accessToken.guard";
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  SerializeOptions,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { CreateGroupDto } from "./dtos/createGroup.dto";
import { GroupEntity } from "./entities/Group.entity";
import { UserEntity } from "../user/entities/User.entity";
import { GroupService } from "./group.service";
import { UpdateGroupDto } from "./dtos/updateGroup.dto";

@ApiTags("Group")
@Controller("group")
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: "Get all groups" })
  @ApiResponse({
    status: 200,
    description: "Return all groups",
    type: [GroupEntity],
  })
  @Get("/")
  async getGroups() {
    return await this.groupService.getGroups();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: "Create new group" })
  @ApiResponse({
    status: 200,
    description: "Return group",
    type: GroupEntity,
  })
  @Post("/new")
  async createGroup(@Body() createGroupDto: CreateGroupDto) {
    return await this.groupService.createGroup(createGroupDto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: "Update group" })
  @ApiResponse({
    status: 200,
    description: "Return group",
    type: GroupEntity,
  })
  @Patch("/:groupCodeName")
  async updateGroup(
    @Param("groupCodeName") groupCodeName: string,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return await this.groupService.updateGroup(groupCodeName, updateGroupDto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: "Delete group" })
  @ApiResponse({
    status: 200,
    description: "Return status",
    schema: { properties: { success: { type: "boolean" } } },
  })
  @Delete("/:groupCodeName")
  async deleteGroup(@Param("groupCodeName") groupCodeName: string) {
    return await this.groupService.deleteGroup(groupCodeName);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: "Get users in group" })
  @ApiResponse({
    status: 200,
    description: "Return users",
    type: [UserEntity],
  })
  @Get("/:groupCodeName/users")
  async getUsers(@Param("groupCodeName") groupCodeName: string) {
    return await this.groupService.getUsersInGroup(groupCodeName);
  }
}
