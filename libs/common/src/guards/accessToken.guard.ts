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
    const usernameFromRequest = this.deriveUsernameFromRequestUser(request['user']);

    try {
      if (usernameFromRequest) {
        const user = await this.userModel.findOne({ username: usernameFromRequest }).lean();

        if (!user) {
          throw new UnauthorizedException('User not found');
        }

        this.authorizeUser(context, user.role);

        return true;
      }

      const token = this.extractTokenFromHeader(request);
      const optionalAuth =
        this.reflector.getAllAndOverride<boolean>('access_token_guard.optional', [
          context.getHandler(),
          context.getClass(),
        ]) ?? false;

      if (!token) {
        if (optionalAuth) {
          return true;
        }

        throw new UnauthorizedException('Unauthorized');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
      });

      const user = await this.userModel.findOne({ username: payload.sub }).lean();

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      request['user'] = payload;

      // check if user.role is in roles from context reflector
      this.authorizeUser(context, user.role);
    } catch (e) {
      // console.log(e);

      throw new UnauthorizedException('Unauthorized');
    }
    return true;
  }

  private authorizeUser(context: ExecutionContext, role: string) {
    const roles =
      this.reflector.getAllAndOverride<string[]>('roles', [context.getHandler(), context.getClass()]) || [];

    const isAdmin = role === Role.ADMIN;
    const isPublic = roles.length === 0;
    const isMatchedRole = roles.includes(role);

    if (!isAdmin && !isPublic && !isMatchedRole) {
      throw new UnauthorizedException('User not authorized to access this resource');
    }
  }

  private deriveUsernameFromRequestUser(requestUser: unknown): string | null {
    if (!requestUser) {
      return null;
    }

    if (typeof requestUser === 'string') {
      return requestUser;
    }

    if (typeof requestUser === 'object' && 'sub' in requestUser) {
      const sub = (requestUser as any).sub;
      if (typeof sub === 'string' && sub.length > 0) {
        return sub;
      }
    }

    return null;
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
