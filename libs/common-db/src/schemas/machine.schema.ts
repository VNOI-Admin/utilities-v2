import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document } from 'mongoose';

export enum MachineStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REVOKED = 'revoked',
}

export type MachineDocument = Machine & Document;

@Schema({ autoCreate: true, autoIndex: true, timestamps: true })
export class Machine {
  @Prop({ required: true, unique: true })
  fingerprint!: string;

  @Prop({ required: true })
  publicKey!: string;

  @Prop({ required: true, index: true })
  code!: string;

  @Prop({ required: true, type: String, enum: MachineStatus, default: MachineStatus.PENDING })
  status!: MachineStatus;

  @Prop()
  hostname?: string;

  @Prop()
  enrollIp?: string;

  @Prop()
  approvedBy?: string;

  @Prop()
  approvedAt?: Date;

  @Prop()
  revokedAt?: Date;
}

export const MachineSchema = SchemaFactory.createForClass(Machine);
