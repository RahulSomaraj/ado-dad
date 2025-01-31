// roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from './user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<UserRole[]>(ROLES_KEY, context.getHandler());
    if (!roles) {
      return true; // No roles set, access is granted
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Assuming user is added to the request by the AuthGuard

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const hasRole = roles.some(role => user.roles?.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('User does not have the required role');
    }
    return true;
  }
}
