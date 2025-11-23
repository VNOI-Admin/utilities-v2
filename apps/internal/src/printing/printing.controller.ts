import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { CreatePrintClientDto } from './dtos/createPrintClient.dto';
import { GetPrintJobDto } from './dtos/getPrintJob.dto';
import { UpdatePrintClientDto } from './dtos/updatePrintClient.dto';
import { UpdatePrintJobDto } from './dtos/updatePrintJob.dto';
import { PrintClientEntity } from './entities/printClient.entity';
import { PrintJobEntity } from './entities/printJob.entity';
import { PrintingService } from './printing.service';

@ApiTags('Printing')
@Controller('printing')
export class PrintingController {
  constructor(private readonly printingService: PrintingService) {}

  // Print Job Endpoints

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all print jobs' })
  @ApiResponse({
    status: 200,
    description: 'Return print jobs',
    type: [PrintJobEntity],
  })
  @Get('/jobs')
  async getPrintJobs(@Query() query: GetPrintJobDto) {
    return await this.printingService.getPrintJobs(query);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get one print job' })
  @ApiResponse({
    status: 200,
    description: 'Return print job',
    type: PrintJobEntity,
  })
  @Get('/jobs/:id')
  async getPrintJob(@Param('id') id: string) {
    return await this.printingService.getPrintJob(id);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update one print job' })
  @ApiResponse({
    status: 200,
    description: 'Return print job',
    type: PrintJobEntity,
  })
  @Patch('/jobs/:id')
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
    description: 'Success',
    schema: {
      properties: { success: { type: 'boolean' } },
    },
  })
  @Delete('/jobs/:id')
  async deletePrintJob(@Param('id') id: string) {
    return await this.printingService.deletePrintJob(id);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get print job file' })
  @ApiResponse({
    status: 200,
    description: 'Return file',
  })
  @Get('/jobs/:id/file')
  async getPrintJobFile(@Param('id') id: string): Promise<StreamableFile> {
    return await this.printingService.getPrintJobFile(id);
  }

  // Print Client Endpoints

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
    description: 'Return print clients',
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
    description: 'Return print client',
    type: PrintClientEntity,
  })
  @Get('/clients/:clientId')
  async getPrintClient(@Param('clientId') clientId: string) {
    return await this.printingService.getPrintClient(clientId);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update one print client' })
  @ApiResponse({
    status: 200,
    description: 'Return print client',
    type: PrintClientEntity,
  })
  @Patch('/clients/:clientId')
  async updatePrintClient(
    @Param('clientId') clientId: string,
    @Body() updatePrintClientDto: UpdatePrintClientDto,
  ) {
    return await this.printingService.updatePrintClient(
      clientId,
      updatePrintClientDto,
    );
  }
}
