import {
  PrintJob,
  PrintJobDocument,
} from '@libs/common-db/schemas/printJob.schema';
import { User, UserDocument } from '@libs/common-db/schemas/user.schema';
import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrintJobEntity } from './entities/PrintJob.entity';
import { plainToInstance } from 'class-transformer';
import { UpdatePrintJobDto } from './dtos/updatePrintJob.dto';

@Injectable()
export class PrintingService implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(PrintJob.name)
    private printJobModel: Model<PrintJobDocument>,
  ) {}

  async onModuleInit() {}

  async createPrintJob(callerId: string, file: Express.Multer.File) {
    const user = await this.userModel.findOne({ _id: callerId }).lean();
    if (!user) {
      throw new BadRequestException('User not found');
    }

    try {
      const printJob = await this.printJobModel.create({
        user: user._id,
        requestedAt: new Date(),
        filename: file.originalname,
        content: file.buffer,
      });

      await printJob.save();

      return { success: true };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getPrintJobs(): Promise<PrintJobEntity[]> {
    const printJobs = await this.printJobModel.find().lean().populate('user');
    return plainToInstance(PrintJobEntity, printJobs);
  }

  async getPrintJob(id: string): Promise<PrintJobEntity> {
    try {
      const printJob = await this.printJobModel
        .findOne({
          _id: id,
        })
        .lean()
        .populate('user');

      if (!printJob) {
        throw new BadRequestException('Print job not found');
      }

      return plainToInstance(PrintJobEntity, printJob);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async updatePrintJob(id: string, updatePrintJobDto: UpdatePrintJobDto) {
    try {
      const printJob = await this.printJobModel.findOne({ _id: id });
      if (!printJob) {
        throw new BadRequestException('Print job not found');
      }

      if ('username' in updatePrintJobDto) {
        // Find new user document
        const newUser = await this.userModel.findOne({
          username: updatePrintJobDto.username,
        });
        if (!newUser) throw new BadRequestException('User not found');
        printJob.user = newUser.id;
      }

      printJob.status = updatePrintJobDto.status || printJob.status;
      printJob.filename = updatePrintJobDto.filename || printJob.filename;

      await printJob.save();
      const updatedPrintJob = await printJob.populate('user');
      return plainToInstance(PrintJobEntity, updatedPrintJob.toObject());
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async deletePrintJob(id: string) {
    try {
      const printJob = await this.printJobModel.findOne({ _id: id });
      if (!printJob) {
        throw new BadRequestException('Print job not found');
      }
      await printJob.deleteOne();
      return {
        success: true,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getPrintJobFile(id: string): Promise<StreamableFile> {
    try {
      const printJob = await this.printJobModel.findOne({
        _id: id,
      });

      if (!printJob) {
        throw new BadRequestException('Print job not found');
      }

      return new StreamableFile(printJob.content, {
        disposition: `attachment; filename="${printJob.filename}"`,
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
