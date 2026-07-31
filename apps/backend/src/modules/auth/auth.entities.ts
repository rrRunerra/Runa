export interface AuthResponseEntity {
  user: {
    id: string;
    email: string;
    username: string;
    permissions: number[];
    avatarUrl: string | null;
    displayName: string | null;
    sidebarCardBackgroundUrl: string | null;
    passwordChangedAt: Date | null;
  };
  token: string;
}

export interface MfaRequiredEntity {
  mfaRequired: true;
  allowedMethods: string[];
  tempToken: string;
  devices: Array<{ id: string; deviceName: string }>;
}

export interface MfaVerifyEntity {
  success: boolean;
  mfaSuccessToken: string;
}

export interface LoginCodeEntity {
  code: string;
}

export interface LoginCodeStatusEntity {
  status: string;
}
