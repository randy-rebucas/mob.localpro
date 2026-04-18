export type SavedAddress = {
  id: string;
  label: string;
  line: string;
  isDefault: boolean;
  lat?: number;
  lng?: number;
};

export type MeProfile = {
  id: string;
  displayName: string;
  email: string;
  role?: string;
  isEmailVerified?: boolean;
  avatar?: string | null;
  accountType?: string;
  kycStatus?: string;
  addresses: SavedAddress[];
};

export type NotificationPreferences = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  profileVisible: boolean;
  emailCategories: {
    jobUpdates: boolean;
    quoteAlerts: boolean;
    paymentAlerts: boolean;
    messages: boolean;
  };
};
