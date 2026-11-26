export type Role =
  | 'contestant'
  | 'coach'
  | 'admin'
  | 'guest'
  | 'machine-admin'
  | 'machine-admin.read'
  | 'machine-admin.write';

export const ROLES: Role[] = [
  'contestant',
  'coach',
  'admin',
  'guest',
  'machine-admin',
  'machine-admin.read',
  'machine-admin.write',
];

export const MACHINE_READ_ROLES: string[] = ['admin', 'machine-admin', 'machine-admin.read'];
export const MACHINE_WRITE_ROLES: string[] = ['admin', 'machine-admin', 'machine-admin.write'];
export const MACHINE_ROLES: string[] = ['admin', 'machine-admin', 'machine-admin.read', 'machine-admin.write'];

export function isRole(role: string): role is Role {
  return (ROLES as string[]).includes(role);
}

export function homeRoute(role?: string): string {
  if (role === 'coach') return 'CoachView';
  if (role?.startsWith('machine-admin')) return 'Machines';
  return 'Dashboard';
}
