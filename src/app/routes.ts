import {
  BarChart3,
  CalendarClock,
  Home,
  ListChecks,
  Package,
  type LucideIcon,
} from 'lucide-react';

/**
 * Screen ids double as URL segments, so they cannot be renamed casually.
 * Mirrors theria-finance/src/app/routes.ts.
 */
export const SCREENS = [
  'home',
  'deadlines',
  'stock',
  'analysis',
  'tasks',
  'bills',
  'hana',
  'settings',
  'profile',
  'notifications',
] as const;

export type Screen = (typeof SCREENS)[number];

export const pathFor = (screen: Screen): string => (screen === 'home' ? '/' : `/${screen}`);

/** Unknown paths fall back to home. */
export const screenFromPath = (pathname: string): Screen => {
  const segment = pathname.split('/')[1] ?? '';
  if (segment === '') return 'home';
  return (SCREENS as readonly string[]).includes(segment) ? (segment as Screen) : 'home';
};

export const SCREEN_TITLES: Record<Screen, string> = {
  home: 'Home',
  deadlines: 'Deadlines',
  stock: 'Stock',
  analysis: 'Analysis',
  tasks: 'Tasks',
  bills: 'Bills',
  hana: 'Hana',
  settings: 'Settings',
  profile: 'Profile',
  notifications: 'Notifications',
};

export type NavItem = { id: Screen; icon: LucideIcon; label: string };

/**
 * Five destinations with Home centred, so each wing holds two. Home is the
 * hexagon; it is not listed as a wing item.
 *
 * Hana is deliberately absent: she floats over every screen as a companion
 * rather than sitting in the nav, which is what freed this slot for Tasks.
 */
export const NAV_ITEMS: NavItem[] = [
  { id: 'deadlines', icon: CalendarClock, label: 'Deadlines' },
  { id: 'stock', icon: Package, label: 'Stock' },
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'analysis', icon: BarChart3, label: 'Analysis' },
  { id: 'tasks', icon: ListChecks, label: 'Tasks' },
];

/** Screens that manage their own scrolling instead of the page scrolling. */
export const SCROLL_LOCK_SCREENS: readonly Screen[] = ['hana'];
