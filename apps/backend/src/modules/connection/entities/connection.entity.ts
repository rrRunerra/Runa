export class ConnectionEntity {
  id!: string;
  provider!: string;
  linkedUsername!: string | null;
  connectionId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  expiresAt!: Date | null;
  linkedTo!: string | null;
  private!: boolean;
  metadata!: any;
}
