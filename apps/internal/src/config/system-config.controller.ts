import { SystemConfig, type SystemConfigDocument } from '@libs/common-db/schemas/systemConfig.schema';
import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';

@ApiTags('Config')
@ApiBearerAuth()
@Controller('config')
@UseGuards(AccessTokenGuard)
export class SystemConfigController {
  constructor(
    @InjectModel(SystemConfig.name)
    private readonly systemConfigModel: Model<SystemConfigDocument>,
  ) {}

  @RequiredRoles(Role.ADMIN)
  @Get('/:key')
  getConfig(@Param('key') key: string) {
    return this.systemConfigModel.findOne({ key }).lean();
  }

  @RequiredRoles(Role.ADMIN)
  @Post('/:key')
  async setConfig(@Param('key') key: string, @Body('value') value: unknown) {
    await this.systemConfigModel.updateOne({ key }, { value }, { upsert: true });
    return { key, value };
  }
}
