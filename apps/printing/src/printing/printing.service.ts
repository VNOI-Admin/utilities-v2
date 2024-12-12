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
  OnModuleInit,
  StreamableFile,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as uuid from 'uuid';
import { CreatePrintClientDto } from './dtos/createPrintClient.dto';
import { GetPrintJobDto } from './dtos/getPrintJob.dto';
import { UpdatePrintClientDto } from './dtos/updatePrintClient.dto';
import { UpdatePrintJobDto } from './dtos/updatePrintJob.dto';
import { UpdatePrintJobStatusDto } from './dtos/updatePrintJobStatus.dto';
import { PrintClientEntity } from './entities/PrintClient.entity';
import { PrintJobEntity } from './entities/PrintJob.entity';

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

  async verifyPrintContent(content) {
    let line_count = 1;
    const LINE_WIDTH = 99;
    const LINES_BY_PAGE = 90;
    let character_count = 0;
    for (let i = 0; i < content.length; i++) {
      if (content[i] > 0x7e) {
        throw new BadRequestException(
          `File contains invalid character at position ${i}.`,
        );
      }

      character_count++;
      if (character_count > LINE_WIDTH || content[i] == '\n') {
        line_count++;
        character_count = 0;
      }
    }

    if (line_count / LINES_BY_PAGE > 5.0) {
      throw new BadRequestException('File exceeds 5 pages.');
    }
  }

  async createPrintJob(username: string, file: Express.Multer.File) {
    const user = await this.userModel.findOne({ username }).lean();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    try {
      await this.verifyPrintContent(file.buffer);

      const clientId = await this.getFreePrintClient();

      const uniqueId = uuid.v4();

      const printJob = await this.printJobModel.create({
        jobId: uniqueId,
        username: user.username,
        requestedAt: new Date(),
        filename: `${user.username}-${file.originalname}`,
        content: file.buffer.toString('base64'),
        clientId: clientId,
      });

      await printJob.save();

      return { success: true };
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
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

    let clientId: string | null = null;
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
          { jobId: job.jobId },
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

  async getPrintJobFile(
    jobId: string,
    clientId?: string,
  ): Promise<StreamableFile> {
    try {
      const printJob = await this.printJobModel
        .findOne({
          jobId: jobId,
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
      throw new BadRequestException(getErrorMessage(error));
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
        .lean();

      return printJobs.map((printJob) => new PrintJobEntity(printJob));
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error));
    }
  }

  async updatePrintJobStatus(
    jobId: string,
    clientId: string,
    updatePrintJobDto: UpdatePrintJobStatusDto,
  ) {
    try {
      const printJob = await this.printJobModel.findOne({ jobId: jobId });
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
      throw new BadRequestException(getErrorMessage(error));
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
      throw new BadRequestException(getErrorMessage(error));
    }
  }
}
