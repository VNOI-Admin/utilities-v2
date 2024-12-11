import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
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

    const tokens = await this.generateTokens(user.username);

    await this.userModel.updateOne(
      { username: user.username },
      {
        refreshToken: await argon2.hash(tokens.refreshToken),
      },
    );

    return new TokensEntity(tokens);
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
