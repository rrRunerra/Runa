"use server";

import { auth } from "@runa/auth";
import { prisma, Prisma } from "@runa/database";
import { hasPermission, BitField, LynxFlags } from "@runa/permissions";

export interface FieldConfig {
  name: string;
  type: "string" | "number" | "boolean" | "datetime" | "json" | "enum";
  isPk?: boolean;
  isAuto?: boolean;
  isNullable?: boolean;
  enumValues?: string[];
}

function getModelSchema(modelName: string): FieldConfig[] {
  const dmmf = (Prisma as any).dmmf;
  if (dmmf && dmmf.datamodel && dmmf.datamodel.models) {
    const model = dmmf.datamodel.models.find(
      (m: any) => m.name.toLowerCase() === modelName.toLowerCase()
    );
    if (model) {
      return model.fields
        .filter((f: any) => f.kind !== "object")
        .map((f: any) => {
          let type: FieldConfig["type"] = "string";
          if (f.type === "Int" || f.type === "Float" || f.type === "Decimal") {
            type = "number";
          } else if (f.type === "Boolean") {
            type = "boolean";
          } else if (f.type === "DateTime") {
            type = "datetime";
          } else if (f.type === "Json") {
            type = "json";
          } else if (f.kind === "enum") {
            type = "enum";
          }

          const enumValues = f.kind === "enum"
            ? dmmf.datamodel.enums?.find((e: any) => e.name === f.type)?.values?.map((v: any) => v.name)
            : undefined;

          return {
            name: f.name,
            type,
            isPk: f.isId,
            isAuto: f.hasDefaultValue || f.isUpdatedAt,
            isNullable: !f.isRequired,
            enumValues,
          };
        });
    }
  }

  return [];
}

function getPrismaModel(modelName: string) {
  const targetKey = Object.keys(prisma).find(
    (key) => key.toLowerCase() === modelName.toLowerCase()
  );
  const dbModel = targetKey ? (prisma as any)[targetKey] : undefined;
  if (!dbModel) {
    throw new Error(`Model ${modelName} not found on prisma client.`);
  }
  return dbModel;
}

function parseFields(modelName: string, inputData: any) {
  const schema = getModelSchema(modelName);
  if (!schema) return inputData;

  const parsed: any = {};
  for (const field of schema) {
    if (field.isAuto && inputData[field.name] === undefined) {
      continue;
    }
    const val = inputData[field.name];
    if (val === undefined || val === null) {
      if (field.isNullable) {
        parsed[field.name] = null;
      }
      continue;
    }

    if (field.type === "number") {
      parsed[field.name] = Number(val);
    } else if (field.type === "boolean") {
      parsed[field.name] = Boolean(val);
    } else if (field.type === "datetime") {
      parsed[field.name] = new Date(val);
    } else if (field.type === "json") {
      if (typeof val === "string") {
        try {
          parsed[field.name] = JSON.parse(val);
        } catch {
          parsed[field.name] = val;
        }
      } else {
        parsed[field.name] = val;
      }
    } else {
      parsed[field.name] = val;
    }
  }
  return parsed;
}

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
