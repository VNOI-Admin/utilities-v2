import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document } from 'mongoose';

export type FloorPlanDocument = FloorPlan & Document;

// Grid position for all objects
@Schema({ _id: false })
export class GridPosition {
  @Prop({ required: true })
  x!: number;

  @Prop({ required: true })
  y!: number;
}

export const GridPositionSchema = SchemaFactory.createForClass(GridPosition);

// Size for tables (width x height in grid cells)
@Schema({ _id: false })
export class GridSize {
  @Prop({ required: true, default: 1 })
  width!: number;

  @Prop({ required: true, default: 1 })
  height!: number;
}

export const GridSizeSchema = SchemaFactory.createForClass(GridSize);

// Table within a floor
@Schema({ _id: false })
export class FloorTable {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  label!: string;

  @Prop({ type: GridPositionSchema, required: true })
  position!: GridPosition;

  @Prop({ type: GridSizeSchema, required: true })
  size!: GridSize;

  @Prop({ required: false })
  boundUsername?: string;
}

export const FloorTableSchema = SchemaFactory.createForClass(FloorTable);

// Wall orientation enum
export enum WallOrientation {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
}

// Wall segment
@Schema({ _id: false })
export class FloorWall {
  @Prop({ required: true })
  id!: string;

  @Prop({ type: GridPositionSchema, required: true })
  start!: GridPosition;

  @Prop({ required: true })
  length!: number;

  @Prop({ required: true, enum: WallOrientation })
  orientation!: WallOrientation;
}

export const FloorWallSchema = SchemaFactory.createForClass(FloorWall);

// Comment block
@Schema({ _id: false })
export class FloorComment {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  text!: string;

  @Prop({ type: GridPositionSchema, required: true })
  position!: GridPosition;

  @Prop({ type: GridSizeSchema, required: true })
  size!: GridSize;
}

export const FloorCommentSchema = SchemaFactory.createForClass(FloorComment);

// Individual floor within a floor plan
@Schema({ _id: false })
export class Floor {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, default: 20 })
  gridWidth!: number;

  @Prop({ required: true, default: 20 })
  gridHeight!: number;

  @Prop({ type: GridPositionSchema, required: false })
  startingPoint?: GridPosition;

  @Prop({ type: [FloorTableSchema], default: [] })
  tables!: FloorTable[];

  @Prop({ type: [FloorWallSchema], default: [] })
  walls!: FloorWall[];

  @Prop({ type: [FloorCommentSchema], default: [] })
  comments!: FloorComment[];
}

export const FloorSchema = SchemaFactory.createForClass(Floor);

// Main floor plan document
@Schema({ autoCreate: true, autoIndex: true })
export class FloorPlan {
  @Prop({ required: true, unique: true })
  code!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ type: [FloorSchema], default: [] })
  floors!: Floor[];

  @Prop({ required: true, default: true })
  isActive!: boolean;

  @Prop({ required: false })
  createdAt?: Date;

  @Prop({ required: false })
  updatedAt?: Date;
}

export const FloorPlanSchema = SchemaFactory.createForClass(FloorPlan);

// Indexes
FloorPlanSchema.index({ code: 1 });
FloorPlanSchema.index({ isActive: 1 });

// Pre-save hook for timestamps
FloorPlanSchema.pre('save', function (next) {
  const now = new Date();
  if (!this.createdAt) {
    this.createdAt = now;
  }
  this.updatedAt = now;
  next();
});
