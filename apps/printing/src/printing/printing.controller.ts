import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  Request,
  SerializeOptions,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';

import { IPAddressGuard } from '@libs/common/guards/ipAddress.guard';
import { FileUploadDto } from './dtos/fileUpload.dto';
import { UpdatePrintJobStatusDto } from './dtos/updatePrintJobStatus.dto';
import { PrintJobEntity } from './entities/PrintJob.entity';
import { PrintingService } from './printing.service';

@ApiTags('Printing')
@Controller('printing')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class PrintingController {
  constructor(private readonly printingService: PrintingService) {}

  // User endpoint: Submit print job via IP authentication
  @UseGuards(IPAddressGuard)
  @ApiOperation({ summary: 'Send print job' })
  @ApiBody({
    description: 'Print job',
    type: FileUploadDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Receive print job',
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @Post('/jobs')
  async createPrintJob(
    @Request() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    const username = req.user;
    return await this.printingService.createPrintJob(username, file);
  }

  // Print Client endpoints: Auth via authKey query param

  @ApiOperation({ summary: "Get print client's queued jobs" })
  @ApiResponse({
    status: 200,
    description: 'Return print jobs',
    type: [PrintJobEntity],
  })
  @Get('/clients/:clientId/queue')
  async getPrintClientQueue(@Param('clientId') clientId: string, @Query('authKey') authKey: string) {
    if (!authKey || !(await this.printingService.checkPrintClientAuth(clientId, authKey))) {
      throw new UnauthorizedException('Unauthorized');
    }

    // this.printingService.pingPrintClient(clientId, new Date());

    return await this.printingService.getPrintClientQueue(clientId);
  }

  @ApiOperation({ summary: 'Print client heartbeat' })
  @ApiResponse({
    status: 200,
    schema: { properties: { success: { type: 'boolean' } } },
  })
  @Post('/clients/:clientId/heartbeat')
  async printClientHeartbeat(@Param('clientId') clientId: string, @Query('authKey') authKey: string) {
    if (!authKey || !(await this.printingService.checkPrintClientAuth(clientId, authKey))) {
      throw new UnauthorizedException('Unauthorized');
    }

    await this.printingService.pingPrintClient(clientId, new Date());

    return { success: true };
  }

  @ApiOperation({ summary: 'Get print job file' })
  @ApiResponse({
    status: 200,
    description: 'Return print job file',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiProduces('application/octet-stream')
  @Get('/clients/:clientId/jobs/:jobId/file')
  async getClientPrintJobFile(
    @Param('clientId') clientId: string,
    @Param('jobId') jobId: string,
    @Query('authKey') authKey: string,
  ) {
    if (!authKey || !(await this.printingService.checkPrintClientAuth(clientId, authKey))) {
      console.log('Unauthorized', authKey, clientId);
      throw new UnauthorizedException('Unauthorized');
    }

    return await this.printingService.getPrintJobFile(jobId, clientId);
  }

  @ApiOperation({ summary: 'Update print job status' })
  @ApiResponse({
    status: 200,
    schema: { properties: { success: { type: 'boolean' } } },
  })
  @Patch('/clients/:clientId/jobs/:jobId/status')
  async updatePrintJobStatus(
    @Param('clientId') clientId: string,
    @Param('jobId') jobId: string,
    @Query('authKey') authKey: string,
    @Body() updatePrintJobStatusDto: UpdatePrintJobStatusDto,
  ) {
    if (!authKey || !(await this.printingService.checkPrintClientAuth(clientId, authKey))) {
      throw new UnauthorizedException('Unauthorized');
    }

    return await this.printingService.updatePrintJobStatus(jobId, clientId, updatePrintJobStatusDto);
  }
}
