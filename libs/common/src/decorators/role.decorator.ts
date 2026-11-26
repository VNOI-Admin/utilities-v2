import { SetMetadata } from '@nestjs/common';

export enum Role {
  CONTESTANT = 'contestant', // Contestant user
  COACH = 'coach', // Coach user
  ADMIN = 'admin', // Can do anything
  GUEST = 'guest', // Guest user for VPN access
  MACHINE_ADMIN = 'machine-admin',
  MACHINE_ADMIN_READ = 'machine-admin.read',
  MACHINE_ADMIN_WRITE = 'machine-admin.write',
}

export const MACHINE_READ_ROLES = [Role.ADMIN, Role.MACHINE_ADMIN, Role.MACHINE_ADMIN_READ];
export const MACHINE_WRITE_ROLES = [Role.ADMIN, Role.MACHINE_ADMIN, Role.MACHINE_ADMIN_WRITE];

// Set user as default role
export const RequiredRoles = (...roles: Role[]) => {
  // If the endpoint is for user role, then it is public for all roles
  // But a role is still required for the endpoint to be accessed
  if (roles.length === 0) {
    return SetMetadata('roles', [Role.CONTESTANT, Role.COACH, Role.ADMIN]);
  }
  return SetMetadata('roles', roles);
};
