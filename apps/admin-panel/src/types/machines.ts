export type MachineStatus = 'pending' | 'approved' | 'revoked';

export interface Machine {
  fingerprint: string;
  code: string;
  status: MachineStatus;
  hostname?: string;
  enrollIp?: string;
  approvedBy?: string;
  approvedAt?: string;
  revokedAt?: string;
  createdAt: string;
}
