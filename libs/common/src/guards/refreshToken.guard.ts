import type { UserDocument } from '@libs/common-db/schemas/user.schema';
import { User } from '@libs/common-db/schemas/user.schema';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExtractJwt } from 'passport-jwt';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private reflector: Reflector,

    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
      });

      const user = await this.userModel.findOne({ username: payload.username });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      request['user'] = {
        ...payload,
        refreshToken: token,
      };
    } catch (e) {
      console.log(e);

      throw new UnauthorizedException('Unauthorized');
    }
    return true;
  }

  extractTokenFromHeader(req: any): string | null {
    let refreshToken = null;

    if (req?.cookies) {
      refreshToken = req.cookies.refreshToken;
    }

    if (!refreshToken) {
      refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    }

    return refreshToken;
  }
}
