import { FloorPlan, FloorPlanDocument } from '@libs/common-db/schemas/floorPlan.schema';
import { User, UserDocument } from '@libs/common-db/schemas/user.schema';
import { getErrorMessage } from '@libs/common/helper/error';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  BindTableDto,
  CopyTableDto,
  CreateTableDto,
  CreateWallDto,
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

@Injectable()
export class FloorPlanService {
  constructor(
    @InjectModel(FloorPlan.name)
    private floorPlanModel: Model<FloorPlanDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  // Floor Plan CRUD

  async createFloorPlan(dto: CreateFloorPlanDto): Promise<FloorPlanEntity> {
    try {
      const floorPlan = await this.floorPlanModel.create({
        code: dto.code,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive ?? true,
        floors: [],
      });

      await floorPlan.save();

      return new FloorPlanEntity(floorPlan.toObject());
    } catch (error) {
      throw new BadRequestException(`Unable to create floor plan: ${getErrorMessage(error)}`);
    }
  }

  async getFloorPlans(): Promise<FloorPlanEntity[]> {
    const floorPlans = await this.floorPlanModel.find().lean();
    return floorPlans.map((fp) => new FloorPlanEntity(fp));
  }

  async getFloorPlan(code: string): Promise<FloorPlanEntity> {
    const floorPlan = await this.floorPlanModel.findOne({ code }).lean();

    if (!floorPlan) {
      throw new BadRequestException('Floor plan not found');
    }

    return new FloorPlanEntity(floorPlan);
  }

  async updateFloorPlan(code: string, dto: UpdateFloorPlanDto): Promise<FloorPlanEntity> {
    try {
      const floorPlan = await this.floorPlanModel.findOne({ code });

      if (!floorPlan) {
        throw new BadRequestException('Floor plan not found');
      }

      if (dto.name !== undefined) floorPlan.name = dto.name;
      if (dto.description !== undefined) floorPlan.description = dto.description;
      if (dto.isActive !== undefined) floorPlan.isActive = dto.isActive;

      await floorPlan.save();

      return new FloorPlanEntity(floorPlan.toObject());
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async deleteFloorPlan(code: string): Promise<{ success: boolean }> {
    const floorPlan = await this.floorPlanModel.findOne({ code });

    if (!floorPlan) {
      throw new BadRequestException('Floor plan not found');
    }

    await floorPlan.deleteOne();
    return { success: true };
  }

  // Floor Management

  async addFloor(code: string, dto: CreateFloorDto): Promise<FloorEntity> {
    try {
      const floorPlan = await this.floorPlanModel.findOne({ code });

      if (!floorPlan) {
        throw new BadRequestException('Floor plan not found');
      }

      const newFloor = {
        id: uuidv4(),
        name: dto.name,
        gridWidth: dto.gridWidth ?? 20,
        gridHeight: dto.gridHeight ?? 20,
        startingPoint: dto.startingPoint,
        tables: [],
        walls: [],
        comments: [],
      };

      floorPlan.floors.push(newFloor);
      await floorPlan.save();

      return new FloorEntity(newFloor);
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async getFloor(code: string, floorId: string): Promise<FloorEntity> {
    const floorPlan = await this.floorPlanModel.findOne({ code }).lean();

    if (!floorPlan) {
      throw new BadRequestException('Floor plan not found');
    }

    const floor = floorPlan.floors.find((f) => f.id === floorId);

    if (!floor) {
      throw new BadRequestException('Floor not found');
    }

    return new FloorEntity(floor);
  }

  async updateFloor(code: string, floorId: string, dto: UpdateFloorDto): Promise<FloorEntity> {
    try {
      const floorPlan = await this.floorPlanModel.findOne({ code });

      if (!floorPlan) {
        throw new BadRequestException('Floor plan not found');
      }

      const floorIndex = floorPlan.floors.findIndex((f) => f.id === floorId);

      if (floorIndex === -1) {
        throw new BadRequestException('Floor not found');
      }

      const floor = floorPlan.floors[floorIndex];

      if (dto.name !== undefined) floor.name = dto.name;
      if (dto.gridWidth !== undefined) floor.gridWidth = dto.gridWidth;
      if (dto.gridHeight !== undefined) floor.gridHeight = dto.gridHeight;
      if (dto.startingPoint !== undefined) floor.startingPoint = dto.startingPoint;

      await floorPlan.save();

      return new FloorEntity(floor);
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async deleteFloor(code: string, floorId: string): Promise<{ success: boolean }> {
    const floorPlan = await this.floorPlanModel.findOne({ code });

    if (!floorPlan) {
      throw new BadRequestException('Floor plan not found');
    }

    const floorIndex = floorPlan.floors.findIndex((f) => f.id === floorId);

    if (floorIndex === -1) {
      throw new BadRequestException('Floor not found');
    }

    floorPlan.floors.splice(floorIndex, 1);
    await floorPlan.save();

    return { success: true };
  }

  // Table Management

  async createTable(code: string, floorId: string, dto: CreateTableDto): Promise<FloorTableEntity> {
    try {
      const floorPlan = await this.floorPlanModel.findOne({ code });

      if (!floorPlan) {
        throw new BadRequestException('Floor plan not found');
      }

      const floor = floorPlan.floors.find((f) => f.id === floorId);

      if (!floor) {
        throw new BadRequestException('Floor not found');
      }

      // Validate username if provided
      if (dto.boundUsername) {
        const user = await this.userModel.findOne({ username: dto.boundUsername });
        if (!user) {
          throw new BadRequestException('User not found');
        }
      }

      const newTable = {
        id: uuidv4(),
        label: dto.label,
        position: dto.position,
        size: dto.size ?? { width: 1, height: 1 },
        boundUsername: dto.boundUsername,
      };

      floor.tables.push(newTable);
      await floorPlan.save();

      return new FloorTableEntity(newTable);
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async updateTable(
    code: string,
    floorId: string,
    tableId: string,
    dto: UpdateTableDto,
  ): Promise<FloorTableEntity> {
    try {
      const floorPlan = await this.floorPlanModel.findOne({ code });

      if (!floorPlan) {
        throw new BadRequestException('Floor plan not found');
      }

      const floor = floorPlan.floors.find((f) => f.id === floorId);

      if (!floor) {
        throw new BadRequestException('Floor not found');
      }

      const table = floor.tables.find((t) => t.id === tableId);

      if (!table) {
        throw new BadRequestException('Table not found');
      }

      if (dto.label !== undefined) table.label = dto.label;
      if (dto.position !== undefined) table.position = dto.position;
      if (dto.size !== undefined) table.size = dto.size;

      await floorPlan.save();

      return new FloorTableEntity(table);
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async deleteTable(code: string, floorId: string, tableId: string): Promise<{ success: boolean }> {
    const floorPlan = await this.floorPlanModel.findOne({ code });

    if (!floorPlan) {
      throw new BadRequestException('Floor plan not found');
    }

    const floor = floorPlan.floors.find((f) => f.id === floorId);

    if (!floor) {
      throw new BadRequestException('Floor not found');
    }

    const tableIndex = floor.tables.findIndex((t) => t.id === tableId);

    if (tableIndex === -1) {
      throw new BadRequestException('Table not found');
    }

    floor.tables.splice(tableIndex, 1);
    await floorPlan.save();

    return { success: true };
  }

  async copyTable(
    code: string,
    floorId: string,
    tableId: string,
    dto: CopyTableDto,
  ): Promise<FloorTableEntity> {
    try {
      const floorPlan = await this.floorPlanModel.findOne({ code });

      if (!floorPlan) {
        throw new BadRequestException('Floor plan not found');
      }

      const floor = floorPlan.floors.find((f) => f.id === floorId);

      if (!floor) {
        throw new BadRequestException('Floor not found');
      }

      const sourceTable = floor.tables.find((t) => t.id === tableId);

      if (!sourceTable) {
        throw new BadRequestException('Source table not found');
      }

      // Validate username if provided
      if (dto.boundUsername) {
        const user = await this.userModel.findOne({ username: dto.boundUsername });
        if (!user) {
          throw new BadRequestException('User not found');
        }
      }

      const newTable = {
        id: uuidv4(),
        label: dto.newLabel ?? `${sourceTable.label}_copy`,
        position: dto.newPosition,
        size: { ...sourceTable.size },
        boundUsername: dto.boundUsername,
      };

      floor.tables.push(newTable);
      await floorPlan.save();

      return new FloorTableEntity(newTable);
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async bindTable(
    code: string,
    floorId: string,
    tableId: string,
    dto: BindTableDto,
  ): Promise<FloorTableEntity> {
    try {
      const floorPlan = await this.floorPlanModel.findOne({ code });

      if (!floorPlan) {
        throw new BadRequestException('Floor plan not found');
      }

      const floor = floorPlan.floors.find((f) => f.id === floorId);

      if (!floor) {
        throw new BadRequestException('Floor not found');
      }

      const table = floor.tables.find((t) => t.id === tableId);

      if (!table) {
        throw new BadRequestException('Table not found');
      }

      // Validate username
      const user = await this.userModel.findOne({ username: dto.username });
      if (!user) {
        throw new BadRequestException('User not found');
      }

      table.boundUsername = dto.username;
      await floorPlan.save();

      return new FloorTableEntity(table);
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async unbindTable(code: string, floorId: string, tableId: string): Promise<FloorTableEntity> {
    try {
      const floorPlan = await this.floorPlanModel.findOne({ code });

      if (!floorPlan) {
        throw new BadRequestException('Floor plan not found');
      }

      const floor = floorPlan.floors.find((f) => f.id === floorId);

      if (!floor) {
        throw new BadRequestException('Floor not found');
      }

      const table = floor.tables.find((t) => t.id === tableId);

      if (!table) {
        throw new BadRequestException('Table not found');
      }

      table.boundUsername = undefined;
      await floorPlan.save();

      return new FloorTableEntity(table);
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  // Wall Management

  async createWall(code: string, floorId: string, dto: CreateWallDto): Promise<FloorWallEntity> {
    try {
      const floorPlan = await this.floorPlanModel.findOne({ code });

      if (!floorPlan) {
        throw new BadRequestException('Floor plan not found');
      }

      const floor = floorPlan.floors.find((f) => f.id === floorId);

      if (!floor) {
        throw new BadRequestException('Floor not found');
      }

      const newWall = {
        id: uuidv4(),
        start: dto.start,
        length: dto.length,
        orientation: dto.orientation,
      };

      floor.walls.push(newWall);
      await floorPlan.save();

      return new FloorWallEntity(newWall);
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async updateWall(
    code: string,
    floorId: string,
    wallId: string,
    dto: UpdateWallDto,
  ): Promise<FloorWallEntity> {
    try {
      const floorPlan = await this.floorPlanModel.findOne({ code });

      if (!floorPlan) {
        throw new BadRequestException('Floor plan not found');
      }

      const floor = floorPlan.floors.find((f) => f.id === floorId);

      if (!floor) {
        throw new BadRequestException('Floor not found');
      }

      const wall = floor.walls.find((w) => w.id === wallId);

      if (!wall) {
        throw new BadRequestException('Wall not found');
      }

      if (dto.start !== undefined) wall.start = dto.start;
      if (dto.length !== undefined) wall.length = dto.length;
      if (dto.orientation !== undefined) wall.orientation = dto.orientation;

      await floorPlan.save();

      return new FloorWallEntity(wall);
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async deleteWall(code: string, floorId: string, wallId: string): Promise<{ success: boolean }> {
    const floorPlan = await this.floorPlanModel.findOne({ code });

    if (!floorPlan) {
      throw new BadRequestException('Floor plan not found');
    }

    const floor = floorPlan.floors.find((f) => f.id === floorId);

    if (!floor) {
      throw new BadRequestException('Floor not found');
    }

    const wallIndex = floor.walls.findIndex((w) => w.id === wallId);

    if (wallIndex === -1) {
      throw new BadRequestException('Wall not found');
    }

    floor.walls.splice(wallIndex, 1);
    await floorPlan.save();

    return { success: true };
  }

  // Comment Management

  async createComment(code: string, floorId: string, dto: any): Promise<any> {
    const floorPlan = await this.floorPlanModel.findOne({ code });

    if (!floorPlan) {
      throw new BadRequestException('Floor plan not found');
    }

    const floor = floorPlan.floors.find((f) => f.id === floorId);

    if (!floor) {
      throw new BadRequestException('Floor not found');
    }

    const comment = {
      id: uuidv4(),
      text: dto.text,
      position: dto.position,
      size: dto.size || { width: 4, height: 2 },
    };

    floor.comments.push(comment);
    await floorPlan.save();

    return new FloorCommentEntity(comment);
  }

  async updateComment(code: string, floorId: string, commentId: string, dto: any): Promise<any> {
    const floorPlan = await this.floorPlanModel.findOne({ code });

    if (!floorPlan) {
      throw new BadRequestException('Floor plan not found');
    }

    const floor = floorPlan.floors.find((f) => f.id === floorId);

    if (!floor) {
      throw new BadRequestException('Floor not found');
    }

    const comment = floor.comments.find((c) => c.id === commentId);

    if (!comment) {
      throw new BadRequestException('Comment not found');
    }

    if (dto.text !== undefined) comment.text = dto.text;
    if (dto.position !== undefined) comment.position = dto.position;
    if (dto.size !== undefined) comment.size = dto.size;

    await floorPlan.save();

    return new FloorCommentEntity(comment);
  }

  async deleteComment(code: string, floorId: string, commentId: string): Promise<{ success: boolean }> {
    const floorPlan = await this.floorPlanModel.findOne({ code });

    if (!floorPlan) {
      throw new BadRequestException('Floor plan not found');
    }

    const floor = floorPlan.floors.find((f) => f.id === floorId);

    if (!floor) {
      throw new BadRequestException('Floor not found');
    }

    const commentIndex = floor.comments.findIndex((c) => c.id === commentId);

    if (commentIndex === -1) {
      throw new BadRequestException('Comment not found');
    }

    floor.comments.splice(commentIndex, 1);
    await floorPlan.save();

    return { success: true };
  }
}
