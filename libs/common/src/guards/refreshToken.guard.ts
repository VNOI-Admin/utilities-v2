import type { UserDocument } from '@libs/common-db/schemas/user.schema';
import { User } from '@libs/common-db/schemas/user.schema';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model } from 'mongoose';
import { ExtractJwt } from 'passport-jwt';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,

    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
      });

      console.log('payload', payload);

      const user = await this.userModel.findOne({ username: payload.sub }).lean();

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

  extractTokenFromHeader(req: Request): string | null {
    let refreshToken: string | null = null;

    if (req?.cookies) {
      refreshToken = req.cookies.refreshToken;
    }

    if (!refreshToken) {
      refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    }

    return refreshToken;
  }
}
