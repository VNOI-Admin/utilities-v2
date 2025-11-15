import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ContestantService } from './contestant.service';
import { CreateContestantDto } from './dtos/create-contestant.dto';
import { UpdateContestantDto } from './dtos/update-contestant.dto';
import { ContestantResponseDto } from './dtos/contestant-response.dto';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';

@ApiTags('Contestants')
@Controller('contestants')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class ContestantController {
  constructor(private readonly contestantService: ContestantService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new contestant (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Contestant created successfully',
    type: ContestantResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Contestant already exists' })
  async create(@Body() createContestantDto: CreateContestantDto) {
    return this.contestantService.create(createContestantDto);
  }

  @Get()
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all contestants' })
  @ApiResponse({
    status: 200,
    description: 'List of all contestants',
    type: [ContestantResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll() {
    return this.contestantService.findAll();
  }

  @Get(':id')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get contestant by ID' })
  @ApiParam({ name: 'id', description: 'Contestant MongoDB ID' })
  @ApiResponse({
    status: 200,
    description: 'Contestant found',
    type: ContestantResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Contestant not found' })
  async findOne(@Param('id') id: string) {
    return this.contestantService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update contestant (admin only)' })
  @ApiParam({ name: 'id', description: 'Contestant MongoDB ID' })
  @ApiResponse({
    status: 200,
    description: 'Contestant updated successfully',
    type: ContestantResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Contestant not found' })
  async update(
    @Param('id') id: string,
    @Body() updateContestantDto: UpdateContestantDto,
  ) {
    return this.contestantService.update(id, updateContestantDto);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete contestant (admin only)' })
  @ApiParam({ name: 'id', description: 'Contestant MongoDB ID' })
  @ApiResponse({
    status: 200,
    description: 'Contestant deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Contestant not found' })
  async remove(@Param('id') id: string) {
    await this.contestantService.remove(id);
    return { message: 'Contestant deleted successfully' };
  }
}
