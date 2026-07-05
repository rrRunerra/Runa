"use server";

import { auth } from "@runa/auth";
import { prisma, Prisma } from "@runa/database";
import { hasPermission, BitField, LynxFlags } from "@runa/permissions";

import type { FieldConfig } from "../lib/dbSchemaUtils";
import {
  getModelSchema,
  getPrismaModel,
  parseFields,
} from "../lib/dbSchemaUtils";

export type { FieldConfig };

export async function getDatabaseSchema(modelName: string): Promise<FieldConfig[]> {
  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, LynxFlags.MANAGE_DATABASE)) {
    throw new Error("Unauthorized");
  }

  const schema = getModelSchema(modelName);
  if (!schema || schema.length === 0) {
    throw new Error(`No schema found for model: ${modelName}`);
  }
  return schema;
}

export async function getDatabaseRecords(
  modelName: string,
  page: number,
  pageSize: number
): Promise<{ records: any[]; total: number }> {
  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, LynxFlags.MANAGE_DATABASE)) {
    throw new Error("Unauthorized");
  }

  const dbModel = getPrismaModel(modelName);
  const schema = getModelSchema(modelName);
  const pkField = schema?.find((f) => f.isPk);

  // Sorting: Try to sort by PK desc if available, or createdAt desc
  let orderBy: any = undefined;
  if (schema?.some((f) => f.name === "createdAt")) {
    orderBy = { createdAt: "desc" };
  } else if (pkField) {
    orderBy = { [pkField.name]: "desc" };
  }

  const [records, total] = await Promise.all([
    dbModel.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
    }),
    dbModel.count(),
  ]);

  return { records, total };
}

export async function createDatabaseRecord(modelName: string, data: any): Promise<any> {
  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, LynxFlags.MANAGE_DATABASE)) {
    throw new Error("Unauthorized");
  }

  const dbModel = getPrismaModel(modelName);
  const parsedData = parseFields(modelName, data);

  return dbModel.create({
    data: parsedData,
  });
}

export async function updateDatabaseRecord(
  modelName: string,
  id: any,
  data: any
): Promise<any> {
  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, LynxFlags.MANAGE_DATABASE)) {
    throw new Error("Unauthorized");
  }

  const dbModel = getPrismaModel(modelName);
  const schema = getModelSchema(modelName);
  const pkField = schema?.find((f) => f.isPk) || { name: "id", type: "string" };

  const parsedId = pkField.type === "number" ? Number(id) : id;
  const parsedData = parseFields(modelName, data);

  // Avoid updating primary key
  delete parsedData[pkField.name];

  return dbModel.update({
    where: { [pkField.name]: parsedId },
    data: parsedData,
  });
}

export async function deleteDatabaseRecord(modelName: string, id: any): Promise<any> {
  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, LynxFlags.MANAGE_DATABASE)) {
    throw new Error("Unauthorized");
  }

  const dbModel = getPrismaModel(modelName);
  const schema = getModelSchema(modelName);
  const pkField = schema?.find((f) => f.isPk) || { name: "id", type: "string" };

  const parsedId = pkField.type === "number" ? Number(id) : id;

  return dbModel.delete({
    where: { [pkField.name]: parsedId },
  });
}
