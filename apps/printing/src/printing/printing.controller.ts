import { IPAddressGuard } from '@libs/common/guards/IPAddress.guard';
import {
  Controller,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { PrintingService } from './printing.service';

@Controller()
export class PrintingController {
  constructor(private readonly printingService: PrintingService) {}

  @Get()
  getHello(): string {
    return this.printingService.getHello();
  }

  @UseGuards(IPAddressGuard)
  @ApiOperation({ summary: 'Send print job' })
  @ApiResponse({
    status: 200,
    description: 'Receive print job',
  })
  @UseInterceptors(FileInterceptor('file'))
  @Post('/print')
  async print(
    @Request() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    // TODO: Implement printing logic
    console.log(req.userId, file);
  }
}
