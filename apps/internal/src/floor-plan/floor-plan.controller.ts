import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  BindTableDto,
  CopyTableDto,
  CreateCommentDto,
  CreateTableDto,
  CreateWallDto,
  UpdateCommentDto,
  UpdateTableDto,
  UpdateWallDto,
} from './dtos/common.dto';
import {
  CreateFloorDto,
  CreateFloorPlanDto,
  UpdateFloorDto,
  UpdateFloorPlanDto,
} from './dtos/floorPlan.dto';
import {
  FloorCommentEntity,
  FloorEntity,
  FloorPlanEntity,
  FloorTableEntity,
  FloorWallEntity,
} from './entities/floorPlan.entity';
import { FloorPlanService } from './floor-plan.service';

@ApiTags('Floor Plan')
@Controller('floor-plan')
export class FloorPlanController {
  constructor(private readonly floorPlanService: FloorPlanService) {}

  // Floor Plan CRUD

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Create floor plan' })
  @ApiResponse({ status: 200, description: 'Return floor plan', type: FloorPlanEntity })
  @Post('/')
  async createFloorPlan(@Body() dto: CreateFloorPlanDto) {
    return await this.floorPlanService.createFloorPlan(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN, Role.COACH)
  @ApiOperation({ summary: 'Get all floor plans' })
  @ApiResponse({ status: 200, description: 'Return floor plans', type: [FloorPlanEntity] })
  @Get('/')
  async getFloorPlans() {
    return await this.floorPlanService.getFloorPlans();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN, Role.COACH)
  @ApiOperation({ summary: 'Get floor plan by code' })
  @ApiResponse({ status: 200, description: 'Return floor plan', type: FloorPlanEntity })
  @Get('/:code')
  async getFloorPlan(@Param('code') code: string) {
    return await this.floorPlanService.getFloorPlan(code);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update floor plan' })
  @ApiResponse({ status: 200, description: 'Return floor plan', type: FloorPlanEntity })
  @Patch('/:code')
  async updateFloorPlan(@Param('code') code: string, @Body() dto: UpdateFloorPlanDto) {
    return await this.floorPlanService.updateFloorPlan(code, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete floor plan' })
  @ApiResponse({
    status: 200,
    description: 'Success',
    schema: { properties: { success: { type: 'boolean' } } },
  })
  @Delete('/:code')
  async deleteFloorPlan(@Param('code') code: string) {
    return await this.floorPlanService.deleteFloorPlan(code);
  }

  // Floor Management

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Add floor to plan' })
  @ApiResponse({ status: 200, description: 'Return floor', type: FloorEntity })
  @Post('/:code/floors')
  async addFloor(@Param('code') code: string, @Body() dto: CreateFloorDto) {
    return await this.floorPlanService.addFloor(code, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN, Role.COACH)
  @ApiOperation({ summary: 'Get floor' })
  @ApiResponse({ status: 200, description: 'Return floor', type: FloorEntity })
  @Get('/:code/floors/:floorId')
  async getFloor(@Param('code') code: string, @Param('floorId') floorId: string) {
    return await this.floorPlanService.getFloor(code, floorId);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update floor' })
  @ApiResponse({ status: 200, description: 'Return floor', type: FloorEntity })
  @Patch('/:code/floors/:floorId')
  async updateFloor(
    @Param('code') code: string,
    @Param('floorId') floorId: string,
    @Body() dto: UpdateFloorDto,
  ) {
    return await this.floorPlanService.updateFloor(code, floorId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete floor' })
  @ApiResponse({
    status: 200,
    description: 'Success',
    schema: { properties: { success: { type: 'boolean' } } },
  })
  @Delete('/:code/floors/:floorId')
  async deleteFloor(@Param('code') code: string, @Param('floorId') floorId: string) {
    return await this.floorPlanService.deleteFloor(code, floorId);
  }

  // Table Management

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Create table' })
  @ApiResponse({ status: 200, description: 'Return table', type: FloorTableEntity })
  @Post('/:code/floors/:floorId/tables')
  async createTable(
    @Param('code') code: string,
    @Param('floorId') floorId: string,
    @Body() dto: CreateTableDto,
  ) {
    return await this.floorPlanService.createTable(code, floorId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update table' })
  @ApiResponse({ status: 200, description: 'Return table', type: FloorTableEntity })
  @Patch('/:code/floors/:floorId/tables/:tableId')
  async updateTable(
    @Param('code') code: string,
    @Param('floorId') floorId: string,
    @Param('tableId') tableId: string,
    @Body() dto: UpdateTableDto,
  ) {
    return await this.floorPlanService.updateTable(code, floorId, tableId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete table' })
  @ApiResponse({
    status: 200,
    description: 'Success',
    schema: { properties: { success: { type: 'boolean' } } },
  })
  @Delete('/:code/floors/:floorId/tables/:tableId')
  async deleteTable(
    @Param('code') code: string,
    @Param('floorId') floorId: string,
    @Param('tableId') tableId: string,
  ) {
    return await this.floorPlanService.deleteTable(code, floorId, tableId);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Copy table' })
  @ApiResponse({ status: 200, description: 'Return new table', type: FloorTableEntity })
  @Post('/:code/floors/:floorId/tables/:tableId/copy')
  async copyTable(
    @Param('code') code: string,
    @Param('floorId') floorId: string,
    @Param('tableId') tableId: string,
    @Body() dto: CopyTableDto,
  ) {
    return await this.floorPlanService.copyTable(code, floorId, tableId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Bind user to table' })
  @ApiResponse({ status: 200, description: 'Return table', type: FloorTableEntity })
  @Post('/:code/floors/:floorId/tables/:tableId/bind')
  async bindTable(
    @Param('code') code: string,
    @Param('floorId') floorId: string,
    @Param('tableId') tableId: string,
    @Body() dto: BindTableDto,
  ) {
    return await this.floorPlanService.bindTable(code, floorId, tableId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Unbind user from table' })
  @ApiResponse({ status: 200, description: 'Return table', type: FloorTableEntity })
  @Delete('/:code/floors/:floorId/tables/:tableId/bind')
  async unbindTable(
    @Param('code') code: string,
    @Param('floorId') floorId: string,
    @Param('tableId') tableId: string,
  ) {
    return await this.floorPlanService.unbindTable(code, floorId, tableId);
  }

  // Wall Management

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Create wall' })
  @ApiResponse({ status: 200, description: 'Return wall', type: FloorWallEntity })
  @Post('/:code/floors/:floorId/walls')
  async createWall(
    @Param('code') code: string,
    @Param('floorId') floorId: string,
    @Body() dto: CreateWallDto,
  ) {
    return await this.floorPlanService.createWall(code, floorId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update wall' })
  @ApiResponse({ status: 200, description: 'Return wall', type: FloorWallEntity })
  @Patch('/:code/floors/:floorId/walls/:wallId')
  async updateWall(
    @Param('code') code: string,
    @Param('floorId') floorId: string,
    @Param('wallId') wallId: string,
    @Body() dto: UpdateWallDto,
  ) {
    return await this.floorPlanService.updateWall(code, floorId, wallId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete wall' })
  @ApiResponse({
    status: 200,
    description: 'Success',
    schema: { properties: { success: { type: 'boolean' } } },
  })
  @Delete('/:code/floors/:floorId/walls/:wallId')
  async deleteWall(
    @Param('code') code: string,
    @Param('floorId') floorId: string,
    @Param('wallId') wallId: string,
  ) {
    return await this.floorPlanService.deleteWall(code, floorId, wallId);
  }

  // Comment Management

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Create comment' })
  @ApiResponse({ status: 200, description: 'Return comment', type: FloorCommentEntity })
  @Post('/:code/floors/:floorId/comments')
  async createComment(
    @Param('code') code: string,
    @Param('floorId') floorId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return await this.floorPlanService.createComment(code, floorId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update comment' })
  @ApiResponse({ status: 200, description: 'Return comment', type: FloorCommentEntity })
  @Patch('/:code/floors/:floorId/comments/:commentId')
  async updateComment(
    @Param('code') code: string,
    @Param('floorId') floorId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return await this.floorPlanService.updateComment(code, floorId, commentId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete comment' })
  @ApiResponse({
    status: 200,
    description: 'Success',
    schema: { properties: { success: { type: 'boolean' } } },
  })
  @Delete('/:code/floors/:floorId/comments/:commentId')
  async deleteComment(
    @Param('code') code: string,
    @Param('floorId') floorId: string,
    @Param('commentId') commentId: string,
  ) {
    return await this.floorPlanService.deleteComment(code, floorId, commentId);
  }
}
