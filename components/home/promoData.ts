export type PromoBanner = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  /** Expo Router path */
  href: string;
  /** Tailwind-style classes for light card background (left accent) */
  accentClass: string;
  icon: 'verified-user' | 'event-repeat' | 'card-giftcard';
};

export const PROMO_BANNERS: PromoBanner[] = [
  {
    id: 'escrow',
    title: 'Pay with confidence',
    subtitle: 'Funds stay in escrow until you approve completed work.',
    cta: 'How wallet works',
    href: '/wallet',
    accentClass: 'bg-teal-600',
    icon: 'verified-user',
  },
  {
    id: 'recurring',
    title: 'Recurring bookings',
    subtitle: 'Schedule cleaning, maintenance, or visits without re-posting every time.',
    cta: 'Explore recurring',
    href: '/recurring',
    accentClass: 'bg-indigo-600',
    icon: 'event-repeat',
  },
  {
    id: 'rewards',
    title: 'Refer & earn',
    subtitle: 'Invite friends and stack points toward rewards and perks.',
    cta: 'View rewards',
    href: '/loyalty',
    accentClass: 'bg-amber-600',
    icon: 'card-giftcard',
  },
];
