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
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrintJobEntity } from './entities/PrintJob.entity';
import { plainToInstance } from 'class-transformer';
import { UpdatePrintJobDto } from './dtos/updatePrintJob.dto';
import { CreatePrintClientDto } from './dtos/createPrintClient.dto';
import {
  PrintClient,
  PrintClientDocument,
} from '@libs/common-db/schemas/printClient.schema';
import { PrintClientEntity } from './entities/PrintClient.entity';
import { UpdatePrintClientDto } from './dtos/updatePrintClient.dto';
import { UpdatePrintJobStatusDto } from './dtos/updatePrintJobStatus.dto';

@Injectable()
export class PrintingService implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(PrintJob.name)
    private printJobModel: Model<PrintJobDocument>,
    @InjectModel(PrintClient.name)
    private printClientModel: Model<PrintClientDocument>,
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

      if (updatePrintJobDto.username) {
        // Find new user document
        const newUser = await this.userModel.findOne({
          username: updatePrintJobDto.username,
        });
        if (!newUser) throw new BadRequestException('User not found');
        printJob.user = newUser.id;
      }

      printJob.status = updatePrintJobDto.status || printJob.status;
      printJob.clientId = updatePrintJobDto.clientId || printJob.clientId;
      printJob.priority = updatePrintJobDto.priority ?? printJob.priority;

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

  async getPrintJobFile(
    jobId: string,
    clientId?: string,
  ): Promise<StreamableFile> {
    try {
      const printJob = await this.printJobModel.findOne({
        _id: jobId,
      });

      if (!printJob) {
        throw new BadRequestException('Print job not found');
      }

      if (clientId && printJob.clientId !== clientId) {
        throw new UnauthorizedException('Unauthorized');
      }

      return new StreamableFile(printJob.content, {
        disposition: `attachment; filename="${printJob.filename}"`,
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async createPrintClient(createPrintClientDto: CreatePrintClientDto) {
    try {
      const printClient = await this.printClientModel.create({
        ...createPrintClientDto,
      });

      await printClient.save();

      if (!printClient) {
        throw new BadRequestException('Unable to create print client');
      }

      return plainToInstance(PrintClientEntity, printClient.toObject());
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getPrintClients(): Promise<PrintClientEntity[]> {
    const printClients = await this.printClientModel.find().lean();
    return plainToInstance(PrintClientEntity, printClients);
  }

  async getPrintClient(clientId: string): Promise<PrintClientEntity> {
    try {
      const printClient = await this.printClientModel
        .findOne({ clientId })
        .lean();

      if (!printClient) {
        throw new BadRequestException('Print client not found');
      }

      return plainToInstance(PrintClientEntity, printClient);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async updatePrintClient(
    clientId: string,
    updatePrintClientDto: UpdatePrintClientDto,
  ) {
    try {
      const printClient = await this.printClientModel.findOne({ clientId });
      if (!printClient) {
        throw new BadRequestException('Print client not found');
      }

      printClient.clientId =
        updatePrintClientDto.clientId || printClient.clientId;
      printClient.authKey = updatePrintClientDto.authKey ?? printClient.authKey;
      printClient.isActive =
        updatePrintClientDto.isActive ?? printClient.isActive;

      await printClient.save();
      return plainToInstance(PrintClientEntity, printClient.toObject());
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async checkPrintClientAuth(
    clientId: string,
    authKey: string,
  ): Promise<boolean> {
    const printClient = await this.printClientModel.findOne({ clientId });
    if (!printClient) {
      throw new BadRequestException('Print client not found');
    }
    return printClient.isActive && printClient.authKey === authKey;
  }

  async getPrintClientQueue(clientId: string): Promise<PrintJobEntity[]> {
    try {
      const printJobs = await this.printJobModel
        .find({ clientId, status: 'queued' })
        .sort({ priority: -1, requestedAt: 1 })
        .lean()
        .populate('user');

      return plainToInstance(PrintJobEntity, printJobs);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async updatePrintJobStatus(
    jobId: string,
    clientId: string,
    updatePrintJobDto: UpdatePrintJobStatusDto,
  ) {
    try {
      const printJob = await this.printJobModel.findOne({ _id: jobId });
      if (!printJob) {
        throw new BadRequestException('Print job not found');
      }

      if (printJob.clientId !== clientId) {
        throw new UnauthorizedException('Unauthorized');
      }

      printJob.status = updatePrintJobDto.status || printJob.status;

      await printJob.save();
      return { success: true };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async pingPrintClient(clientId: string, date: Date) {
    try {
      const printClient = await this.printClientModel.findOne({ clientId });
      if (!printClient) {
        throw new BadRequestException('Print client not found');
      }

      printClient.lastReportedAt = date;

      await printClient.save();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
