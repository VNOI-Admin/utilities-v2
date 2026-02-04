import type { UserDocument } from '@libs/common-db/schemas/user.schema';
import { User } from '@libs/common-db/schemas/user.schema';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../decorators/role.decorator';

@Injectable()
export class IPAddressGuard implements CanActivate {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const usernameFromRequest = this.deriveUsernameFromRequestUser(request['user']);
    if (usernameFromRequest) {
      const user = await this.userModel.findOne({ username: usernameFromRequest }).lean();
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      this.authorizeUser(context, user.role);

      return true;
    }

    const strictIpAuth =
      this.reflector.getAllAndOverride<boolean>('ip_address_guard.strict', [
        context.getHandler(),
        context.getClass(),
      ]) ?? true;

    const vpnIpAddress = this.extractRequestIp(request);

    const user = await this.userModel
      .findOne({
        vpnIpAddress,
      })
      .lean();

    if (!user) {
      if (!strictIpAuth) {
        return true;
      }

      throw new UnauthorizedException('User not found');
    }

    request['user'] = user.username;

    this.authorizeUser(context, user.role);

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

  private extractRequestIp(request: any): string {
    const xRealIp = request.headers['x-real-ip'];
    if (typeof xRealIp === 'string' && xRealIp.length > 0) {
      return xRealIp;
    }

    const xForwardedFor = request.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string' && xForwardedFor.length > 0) {
      return xForwardedFor.split(',')[0].trim();
    }

    return request.ip;
  }
}
