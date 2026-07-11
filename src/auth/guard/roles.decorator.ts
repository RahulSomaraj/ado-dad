import { SetMetadata } from '@nestjs/common';
import { UserType } from '../../users/enums/user.types';

export const ROLES_KEY = 'roles';
export const IS_PUBLIC_KEY = 'isPublic';
export const Roles = (...roles: UserType[]) => SetMetadata(ROLES_KEY, roles);
