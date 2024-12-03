import type { UserDocument } from '@libs/common-db/schemas/user.schema';
import { User } from '@libs/common-db/schemas/user.schema';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class IPAddressGuard implements CanActivate {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const user = await this.userModel
      .findOne({
        vpnIpAddress:
          request.headers['x-real-ip'] ??
          request.headers['x-forwarded-for'] ??
          request.ip,
      })
      .lean();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    request['userId'] = user._id.toString();

    return true;
  }
}
