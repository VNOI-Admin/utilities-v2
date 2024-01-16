import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthDto } from './dtos/auth.dto';
import { plainToInstance } from 'class-transformer';
import { TokensEntity } from './entities/tokens.entity';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(data: AuthDto): Promise<TokensEntity> {
    const user = await this.userService.findByUsername(data.username);
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }
    const passwordValid = await argon2.verify(user.password, data.password);
    if (!passwordValid) {
      throw new BadRequestException('Invalid credentials');
    }
    const tokens = await this.generateTokens(user._id, user.username);
    await this.updateRefreshToken(user._id, tokens.refreshToken);
    return plainToInstance(TokensEntity, tokens);
  }

  async logout(userId: string) {
    this.userService.update(userId, { refreshToken: null });
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<TokensEntity> {
    const user = await this.userService.findById(userId);
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

    const tokens = await this.generateTokens(user._id, user.username);
    await this.updateRefreshToken(user._id, tokens.refreshToken);
    return plainToInstance(TokensEntity, tokens);
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.userService.update(userId, { refreshToken: hashedRefreshToken });
  }

  async generateTokens(
    userId: string,
    username: string,
  ): Promise<TokensEntity> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, username },
        {
          secret: this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
          expiresIn: this.configService.get<string>(
            'JWT_ACCESS_TOKEN_EXPIRATION_TIME',
          ),
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, username },
        {
          secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
          expiresIn: this.configService.get<string>(
            'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
          ),
        },
      ),
    ]);

    const plain = {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };

    return plainToInstance(TokensEntity, plain);
  }
}
