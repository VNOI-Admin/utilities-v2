import {
  CONTESTANT_LOGIN_LOCKED_UNTIL_CONFIG_KEY,
  SystemConfig,
  type SystemConfigDocument,
} from '@libs/common-db/schemas/systemConfig.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { Role } from '@libs/common/decorators/role.decorator';
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { Model } from 'mongoose';

import type { AuthDto } from './dtos/auth.dto';
import { TokensEntity } from './entities/tokens.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(SystemConfig.name)
    private systemConfigModel: Model<SystemConfigDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(data: AuthDto): Promise<TokensEntity> {
    const user = await this.userModel.findOne({ username: data.username }).lean();

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Access denied');
    }

    const passwordValid = await argon2.verify(user.password, data.password);

    if (!passwordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    await this.ensureContestantLoginIsOpen(user.role);

    const tokens = await this.generateTokens(user.username);

    await this.userModel.updateOne(
      { username: user.username },
      {
        refreshToken: await argon2.hash(tokens.refreshToken),
      },
    );

    return new TokensEntity(tokens);
  }

  private async ensureContestantLoginIsOpen(role: string) {
    if (role !== Role.CONTESTANT) {
      return;
    }

    const config = await this.systemConfigModel.findOne({ key: CONTESTANT_LOGIN_LOCKED_UNTIL_CONFIG_KEY }).lean();
    const lockedUntil = config?.value;

    if (!lockedUntil) {
      return;
    }

    if (Date.now() < new Date(String(lockedUntil)).getTime()) {
      throw new ForbiddenException('Contestant login is not open yet');
    }
  }

  async getUserInfo(username: string) {
    const user = await this.userModel.findOne({ username }).lean();

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    return {
      username: user.username,
      role: user.role,
    };
  }

  async logout(username: string) {
    const user = await this.userModel.findOne({ username });

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    user.refreshToken = undefined;

    await user.save();
  }

  async refreshTokens(username: string, refreshToken: string): Promise<TokensEntity> {
    const user = await this.userModel.findOne({ username }).lean();

    if (!user || !user.refreshToken) {
      throw new BadRequestException('Access denied');
    }

    const refreshTokenValid = await argon2.verify(user.refreshToken, refreshToken);

    if (!refreshTokenValid) {
      throw new BadRequestException('Access denied');
    }

    const tokens = await this.generateTokens(user.username);

    await this.userModel.updateOne(
      { username },
      {
        refreshToken: await argon2.hash(tokens.refreshToken),
      },
    );

    return new TokensEntity(tokens);
  }

  async generateTokens(username: string): Promise<TokensEntity> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: username },
        {
          secret: this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
          expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION_TIME'),
        },
      ),
      this.jwtService.signAsync(
        { sub: username },
        {
          secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION_TIME'),
        },
      ),
    ]);

    return new TokensEntity({
      accessToken,
      refreshToken,
    });
  }
}
