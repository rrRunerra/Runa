import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export type PermissionOperator = 'any' | 'all';

/**
 * @param flags - Array of permission flags (e.g. `[AquilaFlags.MEDIA_REFRESH]`)
 * @param operator - `'all'` (default) requires every flag, `'any'` requires at least one
 */
export const Permissions = (
  flags: bigint[],
  operator: PermissionOperator = 'all',
) => SetMetadata(PERMISSIONS_KEY, { flags, operator });
