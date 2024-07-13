<script lang="ts">

export enum Role {
  CONTESTANT = 'contestant',
  COACH = 'coach',
  ADMIN = 'admin',
}

export type CreateUserPayload = {
  username: string;
  fullName: string;
  password: string;
  role: Role;
};

export type UpdateUserPayload = {
  usernameNew: string;
  fullName: string;
  password: string;
  role: Role;
  group: string;
};

export interface UserResponse {
  username: string;
  isActive: boolean;
  vpnIpAddress: string;
  role: string;
  machineUsage: {
    cpu: number;
    memory: number;
    disk: number;
    ping: number;
    isOnline: boolean;
    lastReportedAt: Date | null;
  };
};

</script>