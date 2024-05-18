import { SetMetadata } from '@nestjs/common';

export enum Role {
  USER = 'user', // Basic user
  CONTESTANT = 'contestant', // Contestant user
  COACH = 'coach', // Coach user
  ADMIN = 'admin', // Can do anything
}

// Set user as default role
export const RequiredRoles = (...roles: Role[]) => {
  // If the endpoint is for user role, then it is public for all roles
  // But a role is still required for the endpoint to be accessed
  if (roles.includes(Role.USER)) {
    return SetMetadata('roles', [Role.USER]);
  }
  return SetMetadata('roles', roles);
};
