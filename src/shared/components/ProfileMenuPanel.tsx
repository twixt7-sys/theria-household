import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  LogOut,
  Package,
  Settings,
  User,
} from 'lucide-react';
import { signOutUser } from '../../core/firebase/auth';
import { useAuth } from '../../core/state/AuthContext';
import { useHousehold } from '../../core/state/HouseholdContext';
import { DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';
import { cn } from '../lib/cn';

/**
 * The panel that unfolds from the avatar in the top right.
 *
 * Ported from Finance's ProfileMenuPanel, with its three stat circles carrying
 * household figures instead of money: what is critical, what needs an eye, and
 * how much is being tracked. Tapping any of them goes somewhere useful.
 */
export const ProfileMenuPanel: React.FC<{
  onViewProfile: () => void;
  onViewStock: () => void;
  onViewSettings: () => void;
}> = ({ onViewProfile, onViewStock, onViewSettings }) => {
  const { user } = useAuth();
  const { household, data, status, role } = useHousehold();

  const criticalCount = status.criticalItems.length;
  const attentionCount = status.attentionItems.length;
  const trackedCount = data.stockItems.filter((item) => item.active).length;

  const stats = [
    {
      id: 'critical',
      icon: AlertTriangle,
      value: String(criticalCount),
      label: 'critical',
      circleClass:
        criticalCount > 0
          ? 'border-2 border-status-critical bg-status-critical-soft'
          : 'border-2 border-border bg-transparent',
      contentClass: criticalCount > 0 ? 'text-status-critical' : 'text-muted-foreground',
      onSelect: onViewProfile,
    },
    {
      id: 'attention',
      icon: CheckCircle2,
      value: String(attentionCount),
      label: 'watch',
      circleClass:
        attentionCount > 0
          ? 'border-2 border-status-warning bg-status-warning-soft'
          : 'border-2 border-border bg-transparent',
      contentClass: attentionCount > 0 ? 'text-status-warning' : 'text-muted-foreground',
      onSelect: onViewProfile,
    },
    {
      id: 'tracked',
      icon: Package,
      value: String(trackedCount),
      label: 'tracked',
      circleClass: 'border-2 border-primary bg-primary/5',
      contentClass: 'text-primary',
      onSelect: onViewStock,
    },
  ];

  const menuItems = [
    {
      id: 'profile',
      icon: User,
      label: 'View profile',
      chipClass: 'bg-primary/10 text-primary',
      onSelect: onViewProfile,
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Settings',
      chipClass: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
      onSelect: onViewSettings,
    },
    {
      id: 'sign-out',
      icon: LogOut,
      label: 'Sign out',
      chipClass: 'bg-destructive/10 text-destructive',
      onSelect: () => void signOutUser(),
    },
  ];

  return (
    <div className="w-64">
      <div className="relative overflow-hidden border-b border-border/50 bg-muted/60 px-2.5 pb-2.5 pt-2.5">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl"
        />

        <DropdownMenuItem
          onSelect={onViewProfile}
          className="relative mb-1.5 cursor-pointer gap-3 rounded-2xl px-2 py-2 focus:bg-card/60"
        >
          <div className="shrink-0 rounded-full border border-border/40 bg-card/40 p-1 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-primary bg-card text-base font-bold text-foreground shadow-inner">
              {user?.displayName?.[0]?.toUpperCase() ?? '?'}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              {user?.displayName ?? 'Signed in'}
            </span>
            <span className="block truncate text-[10px] text-muted-foreground">
              {user?.email ?? ''}
            </span>
            <span className="mt-1 inline-flex w-fit max-w-full items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <span className="truncate">
                {household?.name ?? 'No household'}
                {role ? ` · ${role === 'MANAGER' ? 'Manager' : 'Observer'}` : ''}
              </span>
            </span>
          </div>
        </DropdownMenuItem>

        <div className="relative grid grid-cols-3 gap-1 px-0.5">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <DropdownMenuItem
                key={stat.id}
                onSelect={stat.onSelect}
                className="cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-transparent bg-transparent px-1 py-1.5 text-center focus:bg-card/60"
              >
                <div
                  className={cn(
                    'flex h-11 w-11 flex-col items-center justify-center rounded-full bg-card shadow-sm',
                    stat.circleClass,
                    stat.contentClass,
                  )}
                >
                  <Icon size={10} strokeWidth={2.5} className="mb-0.5" aria-hidden />
                  <span className="tabular text-xs font-bold leading-none">{stat.value}</span>
                </div>
                <span
                  className={cn(
                    'text-[8px] font-semibold uppercase leading-tight tracking-wide',
                    stat.contentClass,
                  )}
                >
                  {stat.label}
                </span>
              </DropdownMenuItem>
            );
          })}
        </div>
      </div>

      <DropdownMenuSeparator className="my-0" />

      <div className="space-y-0.5 p-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={item.id}
              onSelect={item.onSelect}
              className="group cursor-pointer gap-2.5 rounded-full px-1.5 py-1.5"
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  item.chipClass,
                )}
              >
                <Icon size={14} strokeWidth={2.25} aria-hidden />
              </span>
              <span className="flex-1 text-xs font-medium text-foreground">{item.label}</span>
              <ChevronRight
                size={13}
                strokeWidth={2.5}
                className="shrink-0 text-muted-foreground/50 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </DropdownMenuItem>
          );
        })}
      </div>
    </div>
  );
};
