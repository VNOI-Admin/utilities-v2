import { Role } from '../decorators/role.decorator';

export const VPN_ENABLED_ROLES = [Role.CONTESTANT, Role.ADMIN, Role.GUEST] as const;

export function roleHasVpn(role?: string | null): boolean {
  return role !== undefined && role !== null && VPN_ENABLED_ROLES.includes(role as (typeof VPN_ENABLED_ROLES)[number]);
}
