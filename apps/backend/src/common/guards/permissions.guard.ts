import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BitField } from '@runa/permissions';
import {
  PERMISSIONS_KEY,
  PermissionOperator,
} from '../decorators/permissions.decorator';

interface PermissionsMetadata {
  flags: bigint[];
  operator: PermissionOperator;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const metadata = this.reflector.getAllAndOverride<PermissionsMetadata>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { permissions: number[] };
    }>();
    const userPermissions = request.user?.permissions;

    if (!userPermissions) {
      return false;
    }

    const bitfield = new BitField(userPermissions);

    if (metadata.operator === 'any') {
      return metadata.flags.some((flag) => bitfield.any(flag));
    }

    return metadata.flags.every((flag) => bitfield.has(flag));
  }
}
