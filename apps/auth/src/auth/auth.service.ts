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

// Verified against when the username does not exist, so the login response
// takes the same argon2 work regardless of whether the account exists.
const DUMMY_PASSWORD_FOR_TIMING = 'vnoi-timing-equalizer';

@Injectable()
export class AuthService {
  private dummyHashPromise?: Promise<string>;

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

    // Always run exactly one argon2 verification: returning early for an
    // unknown username would leak account existence through response latency.
    const storedHash =
      user?.password ?? (this.dummyHashPromise ??= argon2.hash(DUMMY_PASSWORD_FOR_TIMING));
    const passwordValid = await argon2.verify(await storedHash, data.password);

    if (!user || !passwordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Access denied');
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

    // Refresh must enforce the same user-state controls as login, otherwise
    // deactivation and the contestant login lock only take effect after the
    // refresh token expires (7d by default).
    if (!user.isActive) {
      throw new ForbiddenException('Access denied');
    }

    await this.ensureContestantLoginIsOpen(user.role);

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
