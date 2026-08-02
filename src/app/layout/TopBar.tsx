import React from 'react';
import { Bell, CloudOff, Eye } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../core/state/AuthContext';
import { useHousehold } from '../../core/state/HouseholdContext';
import {
  TheriaBrandLogo,
  TheriaBrandWordmark,
} from '../../shared/components/TheriaBrandLogo';
import { ProfileMenuPanel } from '../../shared/components/ProfileMenuPanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../shared/components/ui/dropdown-menu';
import { useUi } from '../state/uiStore';
import { SCREEN_TITLES, pathFor, type Screen } from '../routes';

export const TopBar: React.FC<{ screen: Screen }> = ({ screen }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role, status, isOffline } = useHousehold();
  const { sidebarOpen, setSidebarOpen } = useUi();

  const attentionCount = status.criticalItems.length + status.attentionItems.length;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 pt-safe shadow-md backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
        <div className="flex items-center gap-2 py-1.5 sm:gap-3">
          {/* The brand is the menu button, exactly as in Finance. */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Menu"
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <TheriaBrandLogo size="sm" />
            <div className="flex min-w-0 items-center gap-2">
              <TheriaBrandWordmark />
              <span className="shrink-0 text-muted-foreground" aria-hidden>
                •
              </span>
              <h1 className="min-w-0 truncate text-xs font-semibold text-muted-foreground sm:text-sm">
                {SCREEN_TITLES[screen]}
              </h1>
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-1.5">
            {/* Connection state is surfaced, never faked. An overseas user on a
                poor line needs to know whether they are seeing live data. */}
            {isOffline && (
              <span
                className="flex items-center gap-1 rounded-lg bg-status-warning-soft px-2 py-1 text-[0.6875rem] font-medium text-status-warning"
                title="You are offline — showing the last known state"
              >
                <CloudOff size={13} aria-hidden />
                <span className="hidden sm:inline">Offline</span>
              </span>
            )}

            {/* An Observer is told plainly what they are, rather than left to
                infer it from missing buttons. */}
            {role === 'OBSERVER' && (
              <span
                className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-[0.6875rem] font-medium text-muted-foreground"
                title="You can view this household but not change it"
              >
                <Eye size={13} aria-hidden />
                <span className="hidden sm:inline">Observer</span>
              </span>
            )}

            <button
              onClick={() => navigate(pathFor('notifications'))}
              className="relative rounded-lg p-1.5 text-foreground transition-colors hover:bg-muted"
              title="Notifications"
              aria-label={
                attentionCount > 0
                  ? `Notifications, ${attentionCount} needing attention`
                  : 'Notifications'
              }
            >
              <Bell size={16} />
              {attentionCount > 0 && (
                <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-status-warning ring-2 ring-card" />
              )}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Account menu"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md">
                    <span className="text-xs font-bold">
                      {user?.displayName?.[0]?.toUpperCase() ?? '?'}
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-auto overflow-hidden rounded-2xl border-border/50 p-0 shadow-xl"
              >
                <ProfileMenuPanel
                  onViewProfile={() => navigate(pathFor('profile'))}
                  onViewStock={() => navigate(pathFor('stock'))}
                  onViewSettings={() => navigate(pathFor('settings'))}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};
