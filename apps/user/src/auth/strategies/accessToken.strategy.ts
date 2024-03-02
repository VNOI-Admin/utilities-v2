import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { UserDocument } from '../../database/schema/user.schema';
import { User } from '../../database/schema/user.schema';

type JwtPayload = {
  sub: string;
  username: string;
  sessionId: string;
  iat: number;
  exp: number;
  user: UserDocument;
};

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_ACCESS_TOKEN_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userModel.findById(payload.sub);
    if (!user) {
      return null;
    }
    if (user.isActive === false) {
      throw new UnauthorizedException('User is not active');
    }
    if (user.sessionId !== payload.sessionId) {
      throw new UnauthorizedException('Invalid session');
    }
    return payload;
  }
}
