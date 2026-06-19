export type NotificationType = "INFO" | "INTERACTIVE";
export type NotificationStatus = "PENDING" | "APPROVED" | "DENIED" | "READ";

export interface DeviceApprovalMetadata {
  deviceId: string;
  deviceName: string;
  publicKey: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  metadata: DeviceApprovalMetadata | null;
  createdAt: Date;
}

export const NotificationEvents = {
  NOTIFICATION_CREATED: "notification:created",
  NOTIFICATION_UPDATED: "notification:updated",
} as const;

export type NotificationEvent = typeof NotificationEvents[keyof typeof NotificationEvents];
