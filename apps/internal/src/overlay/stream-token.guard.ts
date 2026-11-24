import { Role } from '@libs/common/decorators/role.decorator';
import { verifyStreamToken } from '@libs/common/helper/stream-token';
import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StreamTokenGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token: string = request.headers?.['x-stream-token'] ?? '';
    const ip = /^\/stream-source\/(\d+\.\d+\.\d+\.\d+)\//.exec(request.headers?.['x-original-uri'] ?? '')?.[1];
    const secret = this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET');
    if (token && ip && secret && verifyStreamToken(secret, token, ip)) {
      request.user = { sub: 'stream-token', role: Role.ADMIN };
    }
    return true;
  }
}
