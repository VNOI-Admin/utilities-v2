import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ConstructorType } from '@libs/common/serializers/type';

export class GridPositionEntity {
  @Expose()
  @ApiProperty()
  x: number;

  @Expose()
  @ApiProperty()
  y: number;

  constructor(data: ConstructorType<GridPositionEntity>) {
    this.x = data.x;
    this.y = data.y;
  }
}

export class GridSizeEntity {
  @Expose()
  @ApiProperty()
  width: number;

  @Expose()
  @ApiProperty()
  height: number;

  constructor(data: ConstructorType<GridSizeEntity>) {
    this.width = data.width;
    this.height = data.height;
  }
}

export class FloorTableEntity {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  label: string;

  @Expose()
  @ApiProperty({ type: GridPositionEntity })
  @Type(() => GridPositionEntity)
  position: GridPositionEntity;

  @Expose()
  @ApiProperty({ type: GridSizeEntity })
  @Type(() => GridSizeEntity)
  size: GridSizeEntity;

  @Expose()
  @ApiProperty({ required: false })
  boundUsername?: string;

  constructor(data: ConstructorType<FloorTableEntity>) {
    this.id = data.id;
    this.label = data.label;
    this.position = new GridPositionEntity(data.position);
    this.size = new GridSizeEntity(data.size);
    this.boundUsername = data.boundUsername;
  }
}

export class FloorWallEntity {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty({ type: GridPositionEntity })
  @Type(() => GridPositionEntity)
  start: GridPositionEntity;

  @Expose()
  @ApiProperty()
  length: number;

  @Expose()
  @ApiProperty()
  orientation: string;

  constructor(data: ConstructorType<FloorWallEntity>) {
    this.id = data.id;
    this.start = new GridPositionEntity(data.start);
    this.length = data.length;
    this.orientation = data.orientation;
  }
}

export class FloorCommentEntity {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  text: string;

  @Expose()
  @ApiProperty({ type: GridPositionEntity })
  @Type(() => GridPositionEntity)
  position: GridPositionEntity;

  @Expose()
  @ApiProperty({ type: GridSizeEntity })
  @Type(() => GridSizeEntity)
  size: GridSizeEntity;

  constructor(data: ConstructorType<FloorCommentEntity>) {
    this.id = data.id;
    this.text = data.text;
    this.position = new GridPositionEntity(data.position);
    this.size = new GridSizeEntity(data.size);
  }
}

export class FloorEntity {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  gridWidth: number;

  @Expose()
  @ApiProperty()
  gridHeight: number;

  @Expose()
  @ApiProperty({ type: GridPositionEntity, required: false })
  @Type(() => GridPositionEntity)
  startingPoint?: GridPositionEntity;

  @Expose()
  @ApiProperty({ type: [FloorTableEntity] })
  @Type(() => FloorTableEntity)
  tables: FloorTableEntity[];

  @Expose()
  @ApiProperty({ type: [FloorWallEntity] })
  @Type(() => FloorWallEntity)
  walls: FloorWallEntity[];

  @Expose()
  @ApiProperty({ type: [FloorCommentEntity] })
  @Type(() => FloorCommentEntity)
  comments: FloorCommentEntity[];

  constructor(data: ConstructorType<FloorEntity>) {
    this.id = data.id;
    this.name = data.name;
    this.gridWidth = data.gridWidth;
    this.gridHeight = data.gridHeight;
    this.startingPoint = data.startingPoint ? new GridPositionEntity(data.startingPoint) : undefined;
    this.tables = data.tables?.map((t) => new FloorTableEntity(t)) || [];
    this.walls = data.walls?.map((w) => new FloorWallEntity(w)) || [];
    this.comments = data.comments?.map((c) => new FloorCommentEntity(c)) || [];
  }
}

export class FloorPlanEntity {
  @Expose()
  @ApiProperty()
  code: string;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty({ required: false })
  description?: string;

  @Expose()
  @ApiProperty({ type: [FloorEntity] })
  @Type(() => FloorEntity)
  floors: FloorEntity[];

  @Expose()
  @ApiProperty()
  isActive: boolean;

  @Expose()
  @ApiProperty({ required: false })
  createdAt?: Date;

  @Expose()
  @ApiProperty({ required: false })
  updatedAt?: Date;

  constructor(data: ConstructorType<FloorPlanEntity>) {
    this.code = data.code;
    this.name = data.name;
    this.description = data.description;
    this.floors = data.floors?.map((f) => new FloorEntity(f)) || [];
    this.isActive = data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
