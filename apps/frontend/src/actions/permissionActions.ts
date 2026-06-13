"use server";

import { prisma } from "@runa/database";
import { createCacheClient } from "@runa/cache";

export interface SafeUser {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  permissions: number[];
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
  };
  error?: string;
}

const cache = createCacheClient();

export async function getAllUsers(): Promise<GetAllUsersResult> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        permissions: true,
      },
      orderBy: {
        username: "asc",
      },
    });
    return { success: true, users };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch users";
    console.error("Failed to fetch users:", error);
    return { success: false, error: errorMessage };
  }
}

export async function updateUserPermissions(
  userId: string,
  newPermissions: number[]
): Promise<UpdatePermissionsResult> {
  try {
    // 1. Update user in the database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        permissions: newPermissions,
      },
      select: {
        id: true,
        username: true,
        permissions: true,
      },
    });

    // 2. Invalidate cached permissions for the updated user
    const cacheKey = `user:permissions:${userId}`;
    await cache.del(cacheKey);

    return { success: true, user: updatedUser };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update permissions";
    console.error(`Failed to update permissions for user ${userId}:`, error);
    return { success: false, error: errorMessage };
  }
}
