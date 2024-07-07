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

import { Role } from '../decorators/role.decorator';

@Injectable()
export class AccessTokenGuard implements CanActivate {
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
        secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
      });

      const user = await this.userModel.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      request['user'] = payload;

      // check if user.role is in roles from context reflector
      const roles =
        this.reflector.get<string[]>('roles', context.getHandler()) || [];

      const isAdmin = user.role === Role.ADMIN;
      const isPublic = roles.length === 0;
      const isMatchedRole = roles.includes(user.role);
      if (!isAdmin && !isPublic && !isMatchedRole) {
        throw new UnauthorizedException(
          'User not authorized to access this resource',
        );
      }
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
    return true;
  }

  extractTokenFromHeader(req: any): string | null {
    let accessToken = null;

    if (req && req.cookies) {
      accessToken = req.cookies.accessToken;
    }

    if (!accessToken) {
      accessToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    }

    return accessToken;
  }
}
