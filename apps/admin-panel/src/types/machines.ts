export type MachineStatus = 'pending' | 'approved' | 'revoked';

export interface MachineGuest {
  username: string;
  vpnIpAddress: string | null;
  isOnline: boolean;
}

export interface Machine {
  fingerprint: string;
  code: string;
  status: MachineStatus;
  name?: string;
  hostname?: string;
  enrollIp?: string;
  approvedBy?: string;
  approvedAt?: string;
  revokedAt?: string;
  createdAt: string;
  guest: MachineGuest | null;
}
