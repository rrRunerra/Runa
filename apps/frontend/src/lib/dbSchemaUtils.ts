import { prisma, Prisma } from "@runa/database";

export interface FieldConfig {
  name: string;
  type: "string" | "number" | "boolean" | "datetime" | "json" | "enum";
  isPk?: boolean;
  isAuto?: boolean;
  isNullable?: boolean;
  enumValues?: string[];
}

export function getModelSchema(modelName: string): FieldConfig[] {
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

export function getPrismaModel(modelName: string) {
  const targetKey = Object.keys(prisma).find(
    (key) => key.toLowerCase() === modelName.toLowerCase()
  );
  const dbModel = targetKey ? (prisma as any)[targetKey] : undefined;
  if (!dbModel) {
    throw new Error(`Model ${modelName} not found on prisma client.`);
  }
  return dbModel;
}

export function parseFields(modelName: string, inputData: any) {
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
