"use server";

import { auth } from "@runa/auth";
import { prisma } from "@runa/database";
import { BitField, hasPermission, RunaFlags } from "@runa/permissions";
import { createCacheClient } from "@runa/cache";

export interface SafeUser {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  permissions: number[];
  lacertaMaxStorage: number;
  lacertaStorageUsed: number;
}


export interface GetAllUsersResult {
  success: boolean;
  users?: SafeUser[];
  error?: string;
}

export interface UpdatePermissionsResult {
  success: boolean;
  user?: {
    id: string;
    username: string;
    permissions: number[];
    lacertaMaxStorage: number;
  };
  error?: string;
}

const cache = createCacheClient();

export async function getAllUsers(): Promise<GetAllUsersResult> {
  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, RunaFlags.ADMINISTRATOR)) {
    // return { success: false, error: "Unauthorized" };
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        permissions: true,
        lacertaMaxStorage: true,
      },
      orderBy: {
        username: "asc",
      },
    });

    // Group files by user to compute total storage usage
    const storageUsages = await prisma.laceraFile.groupBy({
      by: ["userId"],
      where: {
        isFolder: false,
      },
      _sum: {
        size: true,
      },
    });

    const usageMap = new Map<string, number>(
      storageUsages.map((item) => [item.userId, item._sum.size ?? 0])
    );

    const safeUsers: SafeUser[] = users.map((u) => ({
      ...u,
      lacertaStorageUsed: usageMap.get(u.id) ?? 0,
    }));

    return { success: true, users: safeUsers };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch users";
    console.error("Failed to fetch users:", error);
    return { success: false, error: errorMessage };
  }
}

export async function updateUserPermissions(
  userId: string,
  newPermissions: number[],
  lacertaMaxStorage?: number
): Promise<UpdatePermissionsResult> {
  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, RunaFlags.ADMINISTRATOR)) {
    // return { success: false, error: "Unauthorized" };
  }

  try {
    // 1. Update user in the database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        permissions: newPermissions,
        lacertaMaxStorage: lacertaMaxStorage !== undefined ? lacertaMaxStorage : undefined,
      },
      select: {
        id: true,
        username: true,
        permissions: true,
        lacertaMaxStorage: true,
      },
    });


    // 2. Invalidate cached permissions for the updated user
    const cacheKey = `user:permissions:${userId}`;
    await cache.del(cacheKey);

    return { success: true, user: updatedUser };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update permissions";
    console.error("Failed to update permissions for user %s:", userId, error);
    return { success: false, error: errorMessage };
  }
}

export interface BatchUpdatePermissionsResult {
  success: boolean;
  error?: string;
}

export async function batchUpdateUserPermissions(
  userIds: string[],
  action: "grant" | "revoke" | "replace",
  permissionFlags: number[]
): Promise<BatchUpdatePermissionsResult> {
  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, RunaFlags.ADMINISTRATOR)) {
    return { success: false, error: "Unauthorized" };
  }

  if (userIds.length === 0) {
    return { success: true };
  }

  try {
    if (action === "replace") {
      await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: {
          permissions: permissionFlags,
        },
      });
    } else {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, permissions: true },
      });

      const updates = users.map((user) => {
        const currentBitField = BitField.fromRaw(user.permissions);
        if (action === "grant") {
          currentBitField.add(permissionFlags);
        } else if (action === "revoke") {
          currentBitField.remove(permissionFlags);
        }
        return prisma.user.update({
          where: { id: user.id },
          data: {
            permissions: currentBitField.serialize(),
          },
        });
      });

      await prisma.$transaction(updates);
    }

    // Invalidate cached permissions for all updated users
    for (const userId of userIds) {
      const cacheKey = `user:permissions:${userId}`;
      await cache.del(cacheKey);
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to batch update permissions";
    console.error("Failed to batch update permissions:", error);
    return { success: false, error: errorMessage };
  }
}

export async function batchUpdateUserStorageLimit(
  userIds: string[],
  maxStorageBytes: number
): Promise<BatchUpdatePermissionsResult> {
  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, RunaFlags.ADMINISTRATOR)) {
    return { success: false, error: "Unauthorized" };
  }

  if (userIds.length === 0) {
    return { success: true };
  }

  try {
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: {
        lacertaMaxStorage: maxStorageBytes,
      },
    });

    // Invalidate cached permissions for all updated users
    for (const userId of userIds) {
      const cacheKey = `user:permissions:${userId}`;
      await cache.del(cacheKey);
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to batch update storage limits";
    console.error("Failed to batch update storage limits:", error);
    return { success: false, error: errorMessage };
  }
}

