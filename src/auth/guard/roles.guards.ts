import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { UserType } from '../../users/enums/user.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserType[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    console.log('RolesGuard - Required roles:', requiredRoles);

    if (!requiredRoles) {
      console.log('RolesGuard - No roles required, allowing access');
      return true; // No roles required, allow access
    }

    const { user } = context.switchToHttp().getRequest();
    console.log('RolesGuard - User object:', user);
    console.log('RolesGuard - User type:', user?.type);

    if (!user || !user.type) {
      console.log('RolesGuard - User not authenticated or missing role');
      return false; // User is not authenticated or missing role
    }

    // 🔹 Check if user's role matches any required role
    const hasRole = requiredRoles.includes(user.type);
    console.log('RolesGuard - Has required role:', hasRole);
    return hasRole;
  }
}
