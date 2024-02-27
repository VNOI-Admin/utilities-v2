import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  Request,
  SerializeOptions,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AccessTokenGuard } from '../common/guards/accessToken.guard';
import { RefreshTokenGuard } from '../common/guards/refreshToken.guard';
import { AuthService } from './auth.service';
import { AuthDto } from './dtos/auth.dto';
import { TokensEntity } from './entities/tokens.entity';

@ApiTags('Auth')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'Login using credentials' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: TokensEntity,
  })
  @Post('login')
  async login(@Body() data: AuthDto): Promise<TokensEntity> {
    return this.authService.login(data);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Logout' })
  @Post('logout')
  async logout(@Request() req: any) {
    const userId = req.user['sub'];
    return this.authService.logout(userId);
  }

  @ApiBearerAuth()
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({ summary: "Refresh user's access token" })
  @ApiResponse({
    status: 200,
    description: 'Refresh successful',
    type: TokensEntity,
  })
  @Post('refresh')
  async refresh(@Request() req: any): Promise<TokensEntity> {
    const userId = req.user['sub'];
    const refreshToken = req.user['refreshToken'];
    const sessionId = req.user['sessionId'];
    return this.authService.refreshTokens(userId, refreshToken, sessionId);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Test protected endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Test successful',
  })
  @Get('protected')
  async protected(): Promise<any> {
    return { message: 'This is a protected endpoint' };
  }
}
