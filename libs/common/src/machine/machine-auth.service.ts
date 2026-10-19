import { randomBytes } from 'crypto';
import { Machine, type MachineDocument, MachineStatus } from '@libs/common-db/schemas/machine.schema';
import { MachineNonce, type MachineNonceDocument } from '@libs/common-db/schemas/machineNonce.schema';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  MACHINE_ID_HEADER,
  MACHINE_NONCE_HEADER,
  MACHINE_NONCE_TTL_MS,
  MACHINE_SIGNATURE_HEADER,
  requestBody,
  verifyMachineSignature,
} from './machine-auth';

@Injectable()
export class MachineAuthService {
  constructor(
    @InjectModel(Machine.name)
    private machineModel: Model<MachineDocument>,
    @InjectModel(MachineNonce.name)
    private nonceModel: Model<MachineNonceDocument>,
    private configService: ConfigService,
  ) {}

  required(): boolean {
    return this.configService.get<string>('MACHINE_AUTH_REQUIRED') === 'true';
  }

  async issueNonce(): Promise<string> {
    const nonce = randomBytes(32).toString('base64url');
    await this.nonceModel.create({ nonce, expiresAt: new Date(Date.now() + MACHINE_NONCE_TTL_MS) });
    return nonce;
  }

  // The machine whose key signed this request, whatever its status; null if unsigned or not valid.
  async authenticate(req: any): Promise<Machine | null> {
    const [id, nonce, signature] = [MACHINE_ID_HEADER, MACHINE_NONCE_HEADER, MACHINE_SIGNATURE_HEADER].map((name) =>
      typeof req.headers[name] === 'string' ? req.headers[name] : '',
    );
    if (!id || !nonce || !signature) return null;

    const machine = await this.machineModel.findOne({ fingerprint: id }).lean<Machine>();
    if (!machine) return null;

    // nginx strips the app prefix; X-Original-URI carries the path the machine asked for and signed.
    const path = req.headers['x-original-uri'] || req.originalUrl;
    const body = await requestBody(req);
    if (!verifyMachineSignature(machine.publicKey, signature, nonce, req.method, path, body)) return null;

    const consumed = await this.nonceModel.findOneAndDelete({ nonce, expiresAt: { $gt: new Date() } }).lean();
    return consumed ? machine : null;
  }

  async approvedMachine(req: any): Promise<Machine | null> {
    const machine = await this.authenticate(req);
    return machine?.status === MachineStatus.APPROVED ? machine : null;
  }
}
