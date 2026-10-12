import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import {
  AGENT_AUTH_WINDOW_SECONDS,
  deriveAgentAuthKey,
  isValidAgentAuthTimestamp,
  verifyAgentAuthSignature,
} from '@libs/common/remote-control/agent-auth';
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  type RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Request } from 'express';
import { Model } from 'mongoose';

// The path in the signed message is the one this service sees (after any reverse-proxy
// prefix strip), i.e. "/machine/luks-escrow" - machines sign that, not the external URL.
const REPLAY_TTL_MS = AGENT_AUTH_WINDOW_SECONDS * 2 * 1000;

@Injectable()
export class MachineHmacGuard implements CanActivate {
  private readonly seenSignatures = new Map<string, number>();

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const machine = this.header(request, 'x-vnoi-machine');
    const timestamp = this.header(request, 'x-vnoi-timestamp');
    const signature = this.header(request, 'x-vnoi-signature');

    if (!machine || !timestamp || !signature || !isValidAgentAuthTimestamp(timestamp)) {
      throw new UnauthorizedException('Invalid machine authentication');
    }

    const user = await this.userModel
      .findOne({ username: machine, 'keyPair.privateKey': { $ne: null } })
      .select('username keyPair.privateKey')
      .lean<{ username: string; keyPair: { privateKey: string } }>();
    if (!user?.keyPair?.privateKey) {
      throw new UnauthorizedException('Invalid machine authentication');
    }

    const key = deriveAgentAuthKey(user.keyPair.privateKey);
    const body = request.rawBody ?? Buffer.alloc(0);
    if (!verifyAgentAuthSignature(key, signature, timestamp, request.method, request.originalUrl, body)) {
      throw new UnauthorizedException('Invalid machine authentication');
    }

    if (this.isReplay(signature)) {
      throw new UnauthorizedException('Invalid machine authentication');
    }

    request['machine'] = user.username;
    return true;
  }

  private header(request: Request, name: string): string {
    const value = request.headers[name];
    return typeof value === 'string' ? value : '';
  }

  // Mirror of the agent's replay cache: only signatures that already verified are
  // cached, for twice the acceptance window.
  private isReplay(signature: string): boolean {
    const now = Date.now();
    for (const [seen, expiry] of this.seenSignatures) {
      if (expiry < now) this.seenSignatures.delete(seen);
    }
    if (this.seenSignatures.has(signature)) return true;
    this.seenSignatures.set(signature, now + REPLAY_TTL_MS);
    return false;
  }
}
