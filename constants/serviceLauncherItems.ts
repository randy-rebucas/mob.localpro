import type { ComponentProps } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export type ServiceLauncherItem = {
  label: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
  to: string;
  accessibilityLabel: string;
};

/** Shown on home “All services”; if total exceeds this, a “More…” tile links to the full list. */
export const HOME_SERVICES_PREVIEW_COUNT = 5;

export const SERVICE_LAUNCHER_ITEMS: ServiceLauncherItem[] = [
  { label: 'Book Service', icon: 'construction', to: '/jobs/new', accessibilityLabel: 'Book a service, post a new job' },
  { label: 'Find Providers', icon: 'search', to: '/discovery', accessibilityLabel: 'Find providers near you' },
  { label: 'Wallet', icon: 'account-balance-wallet', to: '/wallet', accessibilityLabel: 'Wallet and payments' },
  { label: 'Consultations', icon: 'chat-bubble-outline', to: '/consultations', accessibilityLabel: 'Consultations' },
  { label: 'Recurring', icon: 'autorenew', to: '/recurring', accessibilityLabel: 'Recurring services' },
  { label: 'Rewards', icon: 'card-giftcard', to: '/loyalty', accessibilityLabel: 'Loyalty and rewards' },
  { label: 'Support', icon: 'contact-support', to: '/support', accessibilityLabel: 'Help and support' },
];
