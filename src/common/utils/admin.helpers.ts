import { Request } from 'express';
import { UserRole } from '../../roles/user-role.enum';

/**
 * Checks if the current user is an admin
 */
export function isAdminUser(req?: Request): boolean {
  if (!req) return false;
  const user = (req as any)?.user;
  return user?.role === UserRole.Admin || user?.roles?.includes(UserRole.Admin);
}

/**
 * Determines the isActive filter value based on user role and query parameter
 * - Admins see all items by default (undefined = no filter)
 * - Non-admins see only active items by default (true)
 * - Explicit query parameter overrides default behavior
 */
export function getIsActiveFilter(isActiveQuery?: string, req?: Request): boolean | undefined {
  if (isActiveQuery !== undefined) {
    return isActiveQuery === 'true';
  }
  return isAdminUser(req) ? undefined : true;
}

