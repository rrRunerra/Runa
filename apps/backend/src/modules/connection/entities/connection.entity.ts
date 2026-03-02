export class ConnectionEntity {
  id!: string;
  provider!: string;
  username!: string | null;
  connectionId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  expiresAt!: Date | null;
}
