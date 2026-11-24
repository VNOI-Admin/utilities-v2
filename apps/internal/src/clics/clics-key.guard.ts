import { timingSafeEqual } from 'crypto';
import { Role } from '@libs/common/decorators/role.decorator';
import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClicsKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = this.configService.get<string>('CLICS_API_KEY');
    const header: string = request.headers?.authorization ?? '';
    if (!key || !header.startsWith('Basic ')) return true;

    const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString();
    const password = Buffer.from(decoded.slice(decoded.indexOf(':') + 1));
    const expected = Buffer.from(key);
    if (password.length === expected.length && timingSafeEqual(password, expected)) {
      request.user = { sub: decoded.slice(0, decoded.indexOf(':')) || 'clics-api', role: Role.ADMIN };
    }
    return true;
  }
}
