import {
  Bath,
  Boxes,
  Car,
  CookingPot,
  Droplets,
  Flame,
  Heart,
  Home,
  Leaf,
  PawPrint,
  Pill,
  Refrigerator,
  ShoppingBasket,
  Sparkles,
  Utensils,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Category icons, resolved by name.
 *
 * A curated map rather than `import * as icons from 'lucide-react'`: the
 * namespace import pulls the entire library into the bundle and defeats
 * tree-shaking, which is a steep price for letting a category be a teapot.
 *
 * This does not special-case any household's data (§13.1) — categories are
 * user-created and any name works. An unrecognised icon simply falls back
 * rather than breaking the card.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Bath,
  Boxes,
  Car,
  CookingPot,
  Droplets,
  Flame,
  Heart,
  Home,
  Leaf,
  PawPrint,
  Pill,
  Refrigerator,
  ShoppingBasket,
  Sparkles,
  Utensils,
  Wrench,
  Zap,
};

/** The names a category picker may offer, sorted for a stable UI. */
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS).sort();

export const iconForCategory = (name: string): LucideIcon => CATEGORY_ICONS[name] ?? Boxes;
