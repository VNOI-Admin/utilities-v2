import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdjustGuestCountDto } from './dtos/adjust-guest-count.dto';
import { GuestService } from './guest.service';

@Controller('guests')
@UseGuards(AccessTokenGuard)
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  @Get()
  @RequiredRoles(Role.ADMIN)
  async getGuests() {
    return this.guestService.getGuests();
  }

  @Get('count')
  @RequiredRoles(Role.ADMIN)
  async getGuestCount() {
    return this.guestService.getGuestCount();
  }

  @Post('adjust')
  @RequiredRoles(Role.ADMIN)
  async adjustGuestCount(@Body() dto: AdjustGuestCountDto) {
    return this.guestService.adjustGuestCount(dto.targetCount);
  }
}
