import type { UserDocument } from "@libs/common-db/schemas/user.schema";
import { User } from "@libs/common-db/schemas/user.schema";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

@Injectable()
export class IPAddressGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private reflector: Reflector,

    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ipAddress = request.headers["x-forwarded-for"] || request.connection.remoteAddress;

    if (!ipAddress) {
      throw new UnauthorizedException("Unauthorized");
    }
    try {
      const userId = await this.getUserByIp(ipAddress);
      request["userId"] = userId;
    } catch {
      throw new UnauthorizedException("Unauthorized");
    }
    return true;
  }

  async getUserByIp(ipAddress: string): Promise<string> {
    const user = await this.userModel.findOne({ vpnIpAddress: ipAddress }).lean();
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return user._id.toString();
  }
}
