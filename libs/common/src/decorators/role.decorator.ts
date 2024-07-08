import { SetMetadata } from '@nestjs/common';

export enum Role {
  CONTESTANT = 'contestant', // Contestant user
  COACH = 'coach', // Coach user
  ADMIN = 'admin', // Can do anything
}

// Set user as default role
export const RequiredRoles = (...roles: Role[]) => {
  // If the endpoint is for user role, then it is public for all roles
  // But a role is still required for the endpoint to be accessed
  if (roles.length === 0) {
    return SetMetadata('roles', [Role.CONTESTANT, Role.COACH, Role.ADMIN]);
  }
  return SetMetadata('roles', roles);
};
