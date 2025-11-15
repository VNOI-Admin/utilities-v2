import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Contestant,
  ContestantDocument,
  StreamStatus,
} from '@libs/common-db/schemas/contestant.schema';
import { CreateContestantDto } from './dtos/create-contestant.dto';
import { UpdateContestantDto } from './dtos/update-contestant.dto';

@Injectable()
export class ContestantService {
  constructor(
    @InjectModel(Contestant.name)
    private contestantModel: Model<ContestantDocument>,
  ) {}

  async create(
    createContestantDto: CreateContestantDto,
  ): Promise<ContestantDocument> {
    // Check if contestant with same ID already exists
    const existing = await this.contestantModel.findOne({
      contestantId: createContestantDto.contestantId,
    });

    if (existing) {
      throw new ConflictException(
        `Contestant with ID ${createContestantDto.contestantId} already exists`,
      );
    }

    const contestant = new this.contestantModel(createContestantDto);
    return contestant.save();
  }

  async findAll(): Promise<ContestantDocument[]> {
    return this.contestantModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<ContestantDocument> {
    const contestant = await this.contestantModel.findById(id).exec();

    if (!contestant) {
      throw new NotFoundException(`Contestant with ID ${id} not found`);
    }

    return contestant;
  }

  async findByContestantId(contestantId: string): Promise<ContestantDocument> {
    const contestant = await this.contestantModel
      .findOne({ contestantId })
      .exec();

    if (!contestant) {
      throw new NotFoundException(
        `Contestant with contestant ID ${contestantId} not found`,
      );
    }

    return contestant;
  }

  async update(
    id: string,
    updateContestantDto: UpdateContestantDto,
  ): Promise<ContestantDocument> {
    const contestant = await this.contestantModel
      .findByIdAndUpdate(id, updateContestantDto, { new: true })
      .exec();

    if (!contestant) {
      throw new NotFoundException(`Contestant with ID ${id} not found`);
    }

    return contestant;
  }

  async updateStatus(
    id: string,
    status: StreamStatus,
  ): Promise<ContestantDocument> {
    const update: any = { status };

    // Update last active time if going online
    if (status === StreamStatus.ONLINE) {
      update.lastActiveAt = new Date();
    }

    const contestant = await this.contestantModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();

    if (!contestant) {
      throw new NotFoundException(`Contestant with ID ${id} not found`);
    }

    return contestant;
  }

  async remove(id: string): Promise<void> {
    const result = await this.contestantModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Contestant with ID ${id} not found`);
    }
  }
}
