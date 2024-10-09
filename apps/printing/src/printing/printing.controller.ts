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
  Post,
  Request,
  SerializeOptions,
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
} from '@nestjs/swagger';

import { PrintingService } from './printing.service';
import { FileUploadDto } from './dtos/fileUpload.dto';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { PrintJobEntity } from './entities/PrintJob.entity';
import { UpdatePrintJobDto } from './dtos/updatePrintJob.dto';

@Controller()
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
  @Post('/job/:id')
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
}
