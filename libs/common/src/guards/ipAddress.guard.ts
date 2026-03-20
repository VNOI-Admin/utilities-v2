import type { UserDocument } from '@libs/common-db/schemas/user.schema';
import { User } from '@libs/common-db/schemas/user.schema';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class IPAddressGuard implements CanActivate {
  constructor(
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

    const user = await this.userModel
      .findOne({
        vpnIpAddress: request.headers['x-real-ip'] ?? request.headers['x-forwarded-for'] ?? request.ip,
      })
      .lean();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const roles =
      this.reflector.getAllAndOverride<string[]>('roles', [context.getHandler(), context.getClass()]) || [];

    if (roles.length > 0 && !roles.includes(user.role)) {
      throw new UnauthorizedException('User not authorized to access this resource');
    }

    request['user'] = user.username;

    return true;
  }
}
