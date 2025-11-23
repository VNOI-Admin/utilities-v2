import {
  PrintClient,
  PrintClientDocument,
} from '@libs/common-db/schemas/printClient.schema';
import {
  PrintJob,
  PrintJobDocument,
} from '@libs/common-db/schemas/printJob.schema';
import { User, UserDocument } from '@libs/common-db/schemas/user.schema';
import { getErrorMessage } from '@libs/common/helper/error';
import {
  BadRequestException,
  Injectable,
  StreamableFile,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePrintClientDto } from './dtos/createPrintClient.dto';
import { GetPrintJobDto } from './dtos/getPrintJob.dto';
import { UpdatePrintClientDto } from './dtos/updatePrintClient.dto';
import { UpdatePrintJobDto } from './dtos/updatePrintJob.dto';
import { PrintClientEntity } from './entities/printClient.entity';
import { PrintJobEntity } from './entities/printJob.entity';

@Injectable()
export class PrintingService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(PrintJob.name)
    private printJobModel: Model<PrintJobDocument>,
    @InjectModel(PrintClient.name)
    private printClientModel: Model<PrintClientDocument>,
  ) {}

  // Print Job Methods (Admin)

  async getPrintJobs(
    getPrintJobDto: GetPrintJobDto,
  ): Promise<PrintJobEntity[]> {
    const query = Object.fromEntries(
      Object.entries(getPrintJobDto).filter(
        ([_, value]) => value !== undefined,
      ),
    );

    const printJobs = await this.printJobModel.find(query).lean();

    return printJobs.map((printJob) => new PrintJobEntity(printJob));
  }

  async getPrintJob(id: string): Promise<PrintJobEntity> {
    try {
      const printJob = await this.printJobModel
        .findOne({
          jobId: id,
        })
        .lean();

      if (!printJob) {
        throw new BadRequestException('Print job not found');
      }

      return new PrintJobEntity(printJob);
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async updatePrintJob(id: string, updatePrintJobDto: UpdatePrintJobDto) {
    try {
      const printJob = await this.printJobModel.findOne({ jobId: id });
      if (!printJob) {
        throw new BadRequestException('Print job not found');
      }

      if (updatePrintJobDto.username) {
        // Find new user document
        const newUser = await this.userModel.findOne({
          username: updatePrintJobDto.username,
        });
        if (!newUser) throw new BadRequestException('User not found');
        printJob.username = newUser.id;
      }

      printJob.status = updatePrintJobDto.status || printJob.status;
      printJob.clientId = updatePrintJobDto.clientId || printJob.clientId;
      printJob.priority = updatePrintJobDto.priority ?? printJob.priority;

      await printJob.save();

      return new PrintJobEntity(printJob.toObject());
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async deletePrintJob(id: string) {
    try {
      const printJob = await this.printJobModel.findOne({ jobId: id });
      if (!printJob) {
        throw new BadRequestException('Print job not found');
      }
      await printJob.deleteOne();
      return {
        success: true,
      };
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async getPrintJobFile(jobId: string): Promise<StreamableFile> {
    try {
      const printJob = await this.printJobModel
        .findOne({
          jobId: jobId,
        })
        .lean();

      if (!printJob) {
        throw new BadRequestException('Print job not found');
      }

      return new StreamableFile(Buffer.from(printJob.content, 'base64'), {
        disposition: `attachment; filename="${printJob.filename}"`,
      });
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  // Print Client Methods (Admin)

  async createPrintClient(createPrintClientDto: CreatePrintClientDto) {
    try {
      const printClient = await this.printClientModel.create({
        ...createPrintClientDto,
      });

      await printClient.save();

      if (!printClient) {
        throw new BadRequestException('Unable to create print client');
      }

      return new PrintClientEntity(printClient.toObject());
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async getPrintClients(): Promise<PrintClientEntity[]> {
    const printClients = await this.printClientModel.find().lean();
    return printClients.map(
      (printClient) => new PrintClientEntity(printClient),
    );
  }

  async getPrintClient(clientId: string): Promise<PrintClientEntity> {
    try {
      const printClient = await this.printClientModel
        .findOne({ clientId })
        .lean();

      if (!printClient) {
        throw new BadRequestException('Print client not found');
      }

      return new PrintClientEntity(printClient);
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
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
      return new PrintClientEntity(printClient.toObject());
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }
}
