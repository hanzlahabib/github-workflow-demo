/**
 * User role definitions for MOSD system
 * Each role has specific permissions and access levels
 */
export type UserRole = 'admin' | 'case_worker' | 'consultant' | 'viewer';

/**
 * Base user interface for all user types in the system
 */
export interface User {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  lastActive?: Date;
  isActive: boolean;
}

/**
 * Extended user interface with permissions
 */
export interface UserWithPermissions extends User {
  permissions: UserPermission[];
  departmentId?: string;
  supervisorId?: string;
}

/**
 * Permission types available in the system
 */
export interface UserPermission {
  id: string;
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
  granted: boolean;
}

/**
 * User role configuration with default permissions
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['*'],
  case_worker: ['cases:read', 'cases:write', 'consultations:read', 'consultations:write'],
  consultant: ['consultations:read', 'consultations:write', 'clients:read'],
  viewer: ['cases:read', 'consultations:read', 'reports:read']
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (user: UserWithPermissions, resource: string, action: string): boolean => {
  if (user.role === 'admin') return true;
  
  const permission = user.permissions.find(p => 
    p.resource === resource && p.action === action
  );
  
  return permission?.granted ?? false;
};