import { IPAddressGuard } from '@libs/common/guards/ipAddress.guard';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { PrintingService } from './printing.service';
import { FileUploadDto } from './dtos/fileUpload.dto';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { PrintJobEntity } from './entities/PrintJob.entity';
import { UpdatePrintJobDto } from './dtos/updatePrintJob.dto';
import { CreatePrintClientDto } from './dtos/createPrintClient.dto';
import { PrintClientEntity } from './entities/PrintClient.entity';
import { UpdatePrintClientDto } from './dtos/updatePrintClient.dto';
import { UpdatePrintJobStatusDto } from './dtos/updatePrintJobStatus.dto';
import { plainToInstance } from 'class-transformer';

@ApiTags('Printing')
@Controller('printing')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class PrintingController {
  constructor(private readonly printingService: PrintingService) {}
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
  @Post('/job')
  async createPrintJob(
    @Request() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    return await this.printingService.createPrintJob(req.userId, file);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all print jobs' })
  @ApiResponse({
    status: 200,
    description: 'Return all print jobs',
    type: [PrintJobEntity],
  })
  @Get('/jobs')
  async getPrintJobs() {
    return await this.printingService.getPrintJobs();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get one print job' })
  @ApiResponse({
    status: 200,
    description: 'Return one print job',
    type: PrintJobEntity,
  })
  @Get('/job/:id')
  async getPrintJob(@Param('id') id: string) {
    return await this.printingService.getPrintJob(id);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update one print job' })
  @ApiResponse({
    status: 200,
    description: 'Return one print job',
    type: PrintJobEntity,
  })
  @Patch('/job/:id')
  async updatePrintJob(
    @Param('id') id: string,
    @Body() updatePrintJobDto: UpdatePrintJobDto,
  ) {
    return await this.printingService.updatePrintJob(id, updatePrintJobDto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete one print job' })
  @ApiResponse({
    status: 200,
    description: 'Delete one print job',
  })
  @Delete('/job/:id')
  async deletePrintJob(@Param('id') id: string) {
    return await this.printingService.deletePrintJob(id);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
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
  @Get('/job/:id/file')
  async getPrintJobFile(@Param('id') id: string) {
    return await this.printingService.getPrintJobFile(id);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Create print client' })
  @ApiResponse({
    status: 200,
    description: 'Return print client',
    type: PrintClientEntity,
  })
  @Post('/clients')
  async createPrintClient(@Body() createPrintClientDto: CreatePrintClientDto) {
    return await this.printingService.createPrintClient(createPrintClientDto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all print clients' })
  @ApiResponse({
    status: 200,
    description: 'Return all print clients',
    type: [PrintClientEntity],
  })
  @Get('/clients')
  async getPrintClients() {
    return await this.printingService.getPrintClients();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get one print client' })
  @ApiResponse({
    status: 200,
    description: 'Return one print client',
    type: PrintClientEntity,
  })
  @Get('/client/:clientId')
  async getPrintClient(@Param('clientId') clientId: string) {
    return await this.printingService.getPrintClient(clientId);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update one print client' })
  @ApiResponse({
    status: 200,
    description: 'Return one print client',
    type: PrintClientEntity,
  })
  @Patch('/client/:clientId')
  async updatePrintClient(
    @Param('clientId') clientId: string,
    @Body() updatePrintClientDto: UpdatePrintClientDto,
  ) {
    return await this.printingService.updatePrintClient(
      clientId,
      updatePrintClientDto,
    );
  }

  @ApiOperation({ summary: "Get print client's queued jobs" })
  @ApiResponse({
    status: 200,
    description: 'Return print jobs',
    type: [PrintJobEntity],
  })
  @Get('/client/:clientId/queue')
  async getPrintClientQueue(
    @Param('clientId') clientId: string,
    @Query('authKey') authKey: string,
  ) {
    if (
      !authKey ||
      !(await this.printingService.checkPrintClientAuth(clientId, authKey))
    ) {
      throw new UnauthorizedException('Unauthorized');
    }

    this.printingService.pingPrintClient(clientId, new Date());

    return await this.printingService.getPrintClientQueue(clientId);
  }

  @ApiOperation({ summary: 'Print client heartbeat' })
  @ApiResponse({
    status: 200,
    schema: { properties: { success: { type: 'boolean' } } },
  })
  @Post('/client/:clientId/heartbeat')
  async printClientHeartbeat(
    @Param('clientId') clientId: string,
    @Query('authKey') authKey: string,
  ) {
    if (
      !authKey ||
      !(await this.printingService.checkPrintClientAuth(clientId, authKey))
    ) {
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
  @Get('/client/:clientId/job/:jobId/file')
  async getClientPrintJobFile(
    @Param('clientId') clientId: string,
    @Param('jobId') jobId: string,
    @Query('authKey') authKey: string,
  ) {
    if (
      !authKey ||
      !(await this.printingService.checkPrintClientAuth(clientId, authKey))
    ) {
      throw new UnauthorizedException('Unauthorized');
    }

    return await this.printingService.getPrintJobFile(jobId, clientId);
  }

  @ApiOperation({ summary: 'Update print job status' })
  @ApiResponse({
    status: 200,
    schema: { properties: { success: { type: 'boolean' } } },
  })
  @Patch('/client/:clientId/job/:jobId/status')
  async updatePrintJobStatus(
    @Param('clientId') clientId: string,
    @Param('jobId') jobId: string,
    @Query('authKey') authKey: string,
    @Body() updatePrintJobStatusDto: UpdatePrintJobStatusDto,
  ) {
    if (
      !authKey ||
      !(await this.printingService.checkPrintClientAuth(clientId, authKey))
    ) {
      throw new UnauthorizedException('Unauthorized');
    }

    return await this.printingService.updatePrintJobStatus(
      jobId,
      clientId,
      updatePrintJobStatusDto,
    );
  }
}
