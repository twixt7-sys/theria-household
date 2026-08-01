import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes so later utilities win over earlier conflicting ones. */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
