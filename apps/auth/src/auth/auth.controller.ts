import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { RefreshTokenGuard } from '@libs/common/guards/refreshToken.guard';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Post,
  Request,
  Res,
  SerializeOptions,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { AuthDto } from './dtos/auth.dto';
import { TokensEntity } from './entities/tokens.entity';
import { Response } from 'express';

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
  async login(
    @Body() data: AuthDto,
    @Res() response: Response,
  ): Promise<TokensEntity> {
    const tokens = await this.authService.login(data);
    response.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });
    return tokens;
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
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Test protected endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Test successful',
  })
  @Post('protected')
  async protected(@Request() req: any): Promise<any> {
    return { message: 'This is a protected endpoint', ...req.user };
  }
}
