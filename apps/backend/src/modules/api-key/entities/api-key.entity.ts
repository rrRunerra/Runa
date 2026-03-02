export class ApiKeyEntity {
  id!: string;
  name!: string;
  createdAt!: Date;
  lastUsedAt!: Date | null;
  truncatedKey!: string;
}

export class ApiKeyCreatedEntity {
  id!: string;
  name!: string;
  keyPrefix!: string;
  keyHash!: string;
  userId!: string;
  createdAt!: Date;
  lastUsedAt!: Date | null;
  key!: string;
}
