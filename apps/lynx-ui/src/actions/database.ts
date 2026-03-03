"use server";

import { prisma } from "@runa/database";

const getModel = (name: string) => {
  const prismaKeys = Object.keys(prisma);
  const matchedKey = prismaKeys.find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  );
  return matchedKey ? (prisma as Record<string, any>)[matchedKey] : null; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export async function getDatabaseRows(
  modelName: string,
  page: number,
  limit: number = 100,
) {
  try {
    const model = getModel(modelName);

    if (!model) {
      return { error: `Model ${modelName} not found` };
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      model.findMany({
        skip,
        take: limit,
      }),
      model.count(),
    ]);

    return {
      data,
      total,
      hasMore: skip + limit < total,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch data";
    console.error(`Error fetching rows for ${modelName}:`, error);
    return { error: message };
  }
}

export async function deleteDatabaseRow(
  modelName: string,
  keyField: string,
  value: unknown,
) {
  try {
    const model = getModel(modelName);
    if (!model) return { error: `Model ${modelName} not found` };

    await model.delete({
      where: {
        [keyField]: value,
      },
    });

    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete row";
    console.error(`Error deleting row from ${modelName}:`, error);
    return { error: message };
  }
}

export async function updateDatabaseRow(
  modelName: string,
  keyField: string,
  value: unknown,
  data: Record<string, unknown>,
) {
  try {
    const model = getModel(modelName);
    if (!model) return { error: `Model ${modelName} not found` };

    // Remove the key field from data to avoid trying to update the primary key (usually not allowed or needed)
    const { [keyField]: _unused, ...updateData } = data;

    await model.update({
      where: {
        [keyField]: value,
      },
      data: updateData,
    });

    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update row";
    console.error(`Error updating row in ${modelName}:`, error);
    return { error: message };
  }
}
