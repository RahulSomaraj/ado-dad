import { SetMetadata } from '@nestjs/common';
import { UserType } from '../../users/enums/user.types';

export const ROLES_KEY = 'roles';
export const IS_PUBLIC_KEY = 'roles';
export const Roles = (...roles: UserType[]) => SetMetadata(ROLES_KEY, roles);
