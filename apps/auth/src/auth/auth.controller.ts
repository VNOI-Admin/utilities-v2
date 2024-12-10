import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { RefreshTokenGuard } from '@libs/common/guards/refreshToken.guard';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Post,
  Req,
  Res,
  SerializeOptions,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import ms from 'ms';

import { SUCCESS_RESPONSE } from '@libs/common/types/responses';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthDto } from './dtos/auth.dto';
import { TokensEntity } from './entities/tokens.entity';

@ApiTags('Auth')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class AuthController {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {}

  @ApiOperation({ summary: 'Login using credentials' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: TokensEntity,
  })
  @Post('login')
  async login(@Body() data: AuthDto, @Res() response: Response) {
    const tokens = await this.authService.login(data);
    const accessTokenExpiresIn = this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION_TIME');
    const refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION_TIME');

    const accessTokenMaxAge = accessTokenExpiresIn ? ms(accessTokenExpiresIn) : undefined;
    const refreshTokenMaxAge = refreshTokenExpiresIn ? ms(refreshTokenExpiresIn) : undefined;

    response.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: accessTokenMaxAge,
      secure: true,
    });
    response.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: refreshTokenMaxAge,
      secure: true,
    });

    response.json(new TokensEntity(tokens));
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Logout' })
  @Post('logout')
  async logout(@Req() req: Request, @Res() response: Response) {
    const username = req.user?.['sub'];
    await this.authService.logout(username);
    response.clearCookie('accessToken');
    response.clearCookie('refreshToken');
    response.json(SUCCESS_RESPONSE);
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
  async refresh(@Req() req: Request, @Res() response: Response) {
    const username = req.user?.['sub'];
    const refreshToken = req.user?.['refreshToken'];

    const tokens = await this.authService.refreshTokens(username, refreshToken);

    const accessTokenExpiresIn = this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION_TIME');
    const refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION_TIME');

    const accessTokenMaxAge = accessTokenExpiresIn ? ms(accessTokenExpiresIn) : undefined;
    const refreshTokenMaxAge = refreshTokenExpiresIn ? ms(refreshTokenExpiresIn) : undefined;

    response.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: accessTokenMaxAge,
      secure: true,
    });

    response.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: refreshTokenMaxAge,
      secure: true,
    });

    response.json(new TokensEntity(tokens));
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
  async protected(@Req() req: Request) {
    return { message: 'This is a protected endpoint', ...req.user };
  }
}
