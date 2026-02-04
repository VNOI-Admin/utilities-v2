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

    // Fallthrough: if user already set by previous guard, skip authentication
    if (request['user']) {
      return true;
    }

    // Check if token auth is optional (for OR logic with other guards)
    const isOptional =
      this.reflector.getAllAndOverride<boolean>('accessToken.optional', [context.getHandler(), context.getClass()]) ??
      false;

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      if (isOptional) return true;
      throw new UnauthorizedException('Unauthorized');
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
      });

      const user = await this.userModel.findOne({ username: payload.sub }).lean();

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      request['user'] = payload;

      // check if user.role is in roles from context reflector
      const roles = this.reflector.get<string[]>('roles', context.getHandler()) || [];

      const isAdmin = user.role === Role.ADMIN;
      const isPublic = roles.length === 0;
      const isMatchedRole = roles.includes(user.role);

      if (!isAdmin && !isPublic && !isMatchedRole) {
        throw new UnauthorizedException('User not authorized to access this resource');
      }
    } catch (e) {
      if (isOptional) return true;
      throw new UnauthorizedException('Unauthorized');
    }
    return true;
  }

  extractTokenFromHeader(req: any): string | null {
    let accessToken: string | null = null;

    if (req?.cookies) {
      accessToken = req.cookies.accessToken;
    }

    if (!accessToken) {
      accessToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    }

    return accessToken;
  }
}
