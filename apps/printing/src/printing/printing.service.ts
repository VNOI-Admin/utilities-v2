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
import { GetPrintJobDto } from './dtos/getPrintJob.dto';

@Injectable()
export class PrintingService implements OnModuleInit {
  constructor(
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
      const clientId = await this.getFreePrintClient();

      const printJob = await this.printJobModel.create({
        user: user.username,
        requestedAt: new Date(),
        filename: `${user.username}-${file.originalname}`,
        content: file.buffer.toString('base64'),
        clientId: clientId,
      });

      await printJob.save();

      return { success: true };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getFreePrintClient() {
    const availablePrintClients = await this.printClientModel.find({
      isActive: true,
      isOnline: true,
    });

    // Get the most free print client by counting the number of queued jobs
    const printJobs = await this.printJobModel
      .find({ status: 'queued' })
      .lean();

    const sortedPrintClients = availablePrintClients
      .map((client) => {
        const queuedJobs = printJobs.filter(
          (job) => job.clientId === client.clientId,
        );
        return {
          ...client.toObject(),
          queuedJobs: queuedJobs.length,
        };
      })
      .sort((a, b) => a.queuedJobs - b.queuedJobs);

    let clientId = null;
    if (sortedPrintClients.length > 0) {
      clientId = sortedPrintClients[0].clientId;
    }

    return clientId;
  }

  async getFreePrintClients() {
    const availablePrintClients = await this.printClientModel.find({
      isActive: true,
      isOnline: true,
    });

    // Get the most free print client by counting the number of queued jobs
    const printJobs = await this.printJobModel
      .find({ status: 'queued' })
      .lean();

    const sortedPrintClients = availablePrintClients
      .map((client) => {
        const queuedJobs = printJobs.filter(
          (job) => job.clientId === client.clientId,
        );
        return {
          ...client.toObject(),
          queuedJobs: queuedJobs.length,
        };
      })
      .sort((a, b) => a.queuedJobs - b.queuedJobs);

    return sortedPrintClients;
  }

  async rearrangeFloatingPrintJobs() {
    const floatingPrintJobs = await this.printJobModel
      .find({ clientId: null })
      .lean();

    const freePrintClients = await this.getFreePrintClients();

    const floatingPrintJobsPerClient = Math.ceil(
      floatingPrintJobs.length / freePrintClients.length,
    );

    for (let i = 0; i < freePrintClients.length; i++) {
      const client = freePrintClients[i];
      const jobsToAssign = floatingPrintJobs.slice(
        i * floatingPrintJobsPerClient,
        (i + 1) * floatingPrintJobsPerClient,
      );

      for (const job of jobsToAssign) {
        job.clientId = client.clientId;
        await this.printJobModel.updateOne(
          { _id: job._id },
          { clientId: client.clientId },
        );
      }
    }
  }

  async updatePrintClientStatus(clientId: string, isOnline: boolean) {
    const printClient = await this.printClientModel.findOne({
      clientId,
    });

    if (!printClient) {
      throw new BadRequestException('Print client not found');
    }

    if (printClient.isOnline === isOnline) {
      return;
    }

    printClient.isOnline = isOnline;

    // if print client goes offline, nullify all its queued jobs to be reassigned
    if (!isOnline) {
      await this.printJobModel.updateMany({ clientId }, { clientId: null });
    }

    await printClient.save();

    await this.rearrangeFloatingPrintJobs();
  }

  async getPrintJobs(
    getPrintJobDto: GetPrintJobDto,
  ): Promise<PrintJobEntity[]> {
    const query = Object.fromEntries(
      Object.entries(getPrintJobDto).filter(
        ([_, value]) => value !== undefined,
      ),
    );

    const printJobs = await this.printJobModel.find(query).lean();

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
      const printJob = await this.printJobModel
        .findOne({
          _id: jobId,
        })
        .lean();

      if (!printJob) {
        throw new BadRequestException('Print job not found');
      }

      if (clientId && printJob.clientId !== clientId) {
        throw new UnauthorizedException('Unauthorized');
      }

      return new StreamableFile(Buffer.from(printJob.content, 'base64'), {
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

      printClient.isOnline = true;
      printClient.lastReportedAt = date;

      await printClient.save();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
