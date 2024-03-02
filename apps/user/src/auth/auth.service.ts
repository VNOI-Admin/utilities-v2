import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { plainToInstance } from 'class-transformer';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';

import type { UserDocument } from '../database/schema/user.schema';
import { User } from '../database/schema/user.schema';
import type { AuthDto } from './dtos/auth.dto';
import { TokensEntity } from './entities/tokens.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(data: AuthDto): Promise<TokensEntity> {
    const user = await this.userModel.findOne({ username: data.username, isActive: true });
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }
    const passwordValid = await argon2.verify(user.password, data.password);
    if (!passwordValid) {
      throw new BadRequestException('Invalid credentials');
    }
    const tokens = await this.generateTokens(
      user._id.toString(),
      user.username,
    );
    user.refreshToken = await argon2.hash(tokens.refreshToken);
    await user.save();
    return plainToInstance(TokensEntity, tokens);
  }

  async logout(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new ForbiddenException('Access denied');
    }
    user.refreshToken = null;
    await user.save();
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
    sessionId: string,
  ): Promise<TokensEntity> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    const refreshTokenValid = await argon2.verify(
      user.refreshToken,
      refreshToken,
    );

    if (!refreshTokenValid) {
      throw new BadRequestException('Access denied');
    }

    const tokens = await this.generateTokens(
      user._id.toString(),
      user.username,
      sessionId,
    );
    user.refreshToken = await argon2.hash(tokens.refreshToken);
    await user.save();
    return plainToInstance(TokensEntity, tokens);
  }

  async generateTokens(
    userId: string,
    username: string,
    sessionId?: string,
  ): Promise<TokensEntity> {
    if (!sessionId) {
      sessionId = randomUUID();
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, username: username, sessionId: sessionId },
        {
          secret: this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
          expiresIn: this.configService.get<string>(
            'JWT_ACCESS_TOKEN_EXPIRATION_TIME',
          ),
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, username: username, sessionId: sessionId },
        {
          secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
          expiresIn: this.configService.get<string>(
            'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
          ),
        },
      ),
    ]);

    // Add the tokens to the database
    const user = await this.userModel.findById(userId);
    user.sessionId = sessionId;
    await user.save();

    const plain = {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };

    return plainToInstance(TokensEntity, plain);
  }
}
