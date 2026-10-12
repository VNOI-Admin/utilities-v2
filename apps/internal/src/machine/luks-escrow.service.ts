import { LuksRecovery, type LuksRecoveryDocument } from '@libs/common-db/schemas/luksRecovery.schema';
import { BadRequestException, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { SubmitLuksRecoveryDto } from './dtos/submitLuksRecovery.dto';

const MAX_BODY_BYTES = 4096;
const MAX_PASSPHRASE_LENGTH = 512;

@Injectable()
export class LuksEscrowService {
  constructor(@InjectModel(LuksRecovery.name) private luksRecoveryModel: Model<LuksRecoveryDocument>) {}

  async escrow(username: string, dto: SubmitLuksRecoveryDto, bodyBytes: number) {
    if (bodyBytes > MAX_BODY_BYTES) throw new PayloadTooLargeException('Request body too large');

    const passphrase = dto.recoveryPassphrase.replace(/[\r\n]+$/, '');
    if (passphrase.length === 0 || passphrase.length > MAX_PASSPHRASE_LENGTH) {
      throw new BadRequestException(`Recovery passphrase must be 1-${MAX_PASSPHRASE_LENGTH} characters`);
    }
    if (/[\r\n]/.test(passphrase)) {
      throw new BadRequestException('Recovery passphrase must be a single line');
    }

    const now = new Date();
    const doc = await this.luksRecoveryModel.findOneAndUpdate(
      { username },
      { $set: { recoveryPassphrase: passphrase, updatedAt: now }, $setOnInsert: { escrowedAt: now } },
      { upsert: true, new: true },
    );
    return doc!.toObject();
  }

  async list() {
    return this.luksRecoveryModel.find().select('-recoveryPassphrase').sort({ username: 1 }).lean();
  }

  async getForMachine(username: string) {
    const doc = await this.luksRecoveryModel.findOne({ username }).lean();
    if (!doc) throw new NotFoundException('No escrowed recovery passphrase for this machine');
    return doc;
  }
}
