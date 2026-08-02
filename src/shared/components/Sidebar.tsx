import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BarChart3,
  Bell,
  CalendarClock,
  ChevronUp,
  Info,
  ListChecks,
  LogOut,
  Package,
  Receipt,
  Settings,
  Sparkles,
  Home as HomeIcon,
  User,
} from 'lucide-react';
import { signOutUser } from '../../core/firebase/auth';
import { useHousehold } from '../../core/state/HouseholdContext';
import { useUi } from '../../app/state/uiStore';
import { HanaFace } from './HouseholdBuddy';
import { TheriaBrandLogo, TheriaBrandWordmark } from './TheriaBrandLogo';
import { cn } from '../lib/cn';

/**
 * The slide-in menu, ported from Finance.
 *
 * Two sections: Overview as a row of icon buttons, Features as a tile grid.
 * Both collapse, because a household that only tracks stock should be able to
 * fold the rest away.
 */

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  currentScreen: string;
}

type SidebarItem = {
  icon: React.ElementType;
  label: string;
  screen: string;
  iconBg?: string;
  iconText?: string;
};

const OVERVIEW_ITEMS: SidebarItem[] = [
  { icon: HomeIcon, label: 'Home', screen: 'home' },
  { icon: Bell, label: 'Notifs', screen: 'notifications' },
  { icon: BarChart3, label: 'Analysis', screen: 'analysis' },
];

/** One colour per feature, so the tiles are scannable rather than uniform. */
const FEATURE_ITEMS: SidebarItem[] = [
  { icon: Package, label: 'Stock', screen: 'stock', iconBg: 'bg-emerald-500/15', iconText: 'text-emerald-500' },
  { icon: Receipt, label: 'Bills', screen: 'bills', iconBg: 'bg-amber-500/15', iconText: 'text-amber-500' },
  { icon: CalendarClock, label: 'Deadlines', screen: 'deadlines', iconBg: 'bg-sky-500/15', iconText: 'text-sky-500' },
  { icon: ListChecks, label: 'Tasks', screen: 'tasks', iconBg: 'bg-violet-500/15', iconText: 'text-violet-500' },
];

/** Neutral so the accent colours stay on the icons: grey either way round. */
const ACTIVE_HIGHLIGHT = 'bg-black/10 text-foreground dark:bg-white/15';

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigate, currentScreen }) => {
  const { household, status, role } = useHousehold();
  const { hanaVisible, toggleHana } = useUi();

  const [overviewOpen, setOverviewOpen] = useState(true);
  const [featuresOpen, setFeaturesOpen] = useState(true);

  const attentionCount = status.criticalItems.length + status.attentionItems.length;

  const navigateTo = (screen: string) => {
    onNavigate(screen);
    onClose();
  };

  const renderSectionHeader = (label: string, open: boolean, onToggle: () => void) => (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted/40"
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">
        {label}
      </span>
      <motion.div
        animate={{ rotate: open ? 0 : 180 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="text-muted-foreground/70"
      >
        <ChevronUp size={13} strokeWidth={2.5} />
      </motion.div>
    </button>
  );

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed left-0 top-0 z-[70] h-full w-80 max-w-[85vw] border-r border-border bg-card pt-safe shadow-2xl transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <TheriaBrandLogo size="md" />
            <TheriaBrandWordmark showSlogan layout="inline" size="lg" />
          </div>

          {/* The household itself, and how it is doing right now. */}
          <div className="mx-4 mt-3 mb-2">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-4 py-2 transition-colors',
                attentionCount > 0
                  ? 'bg-status-warning-soft hover:bg-status-warning/20'
                  : 'bg-status-good-soft hover:bg-status-good/20',
              )}
            >
              <HomeIcon
                size={16}
                className={attentionCount > 0 ? 'text-status-warning' : 'text-status-good'}
              />
              <div
                className={cn(
                  'h-6 w-px',
                  attentionCount > 0 ? 'bg-status-warning/50' : 'bg-status-good/50',
                )}
              />
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-xs text-muted-foreground">
                  {household?.name ?? 'Your household'}
                </p>
                <p
                  className={cn(
                    'truncate text-sm font-semibold',
                    attentionCount > 0 ? 'text-status-warning' : 'text-status-good',
                  )}
                >
                  {status.summary}
                </p>
              </div>
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-3 py-2">
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pr-0.5">
              <section className="px-0.5">
                {renderSectionHeader('Overview', overviewOpen, () => setOverviewOpen((p) => !p))}
                <AnimatePresence initial={false}>
                  {overviewOpen && (
                    <motion.div
                      key="overview-nav"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1 flex items-center gap-1">
                        {OVERVIEW_ITEMS.map((item) => {
                          const Icon = item.icon;
                          const isActive = currentScreen === item.screen;
                          return (
                            <motion.button
                              key={item.screen}
                              type="button"
                              whileTap={{ scale: 0.92 }}
                              onClick={() => navigateTo(item.screen)}
                              aria-current={isActive ? 'page' : undefined}
                              aria-label={item.label}
                              title={item.label}
                              className={cn(
                                'flex h-9 flex-1 items-center justify-center rounded-full transition-colors',
                                isActive
                                  ? ACTIVE_HIGHLIGHT
                                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                              )}
                            >
                              <Icon size={16} strokeWidth={2.25} />
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              <section className="px-0.5">
                {renderSectionHeader('Features', featuresOpen, () => setFeaturesOpen((p) => !p))}
                <AnimatePresence initial={false}>
                  {featuresOpen && (
                    <motion.div
                      key="features-nav"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1 grid grid-cols-2 gap-1">
                        {FEATURE_ITEMS.map((item) => {
                          const Icon = item.icon;
                          const isActive = currentScreen === item.screen;
                          return (
                            <motion.button
                              key={item.screen}
                              type="button"
                              whileTap={{ scale: 0.97 }}
                              onClick={() => navigateTo(item.screen)}
                              aria-current={isActive ? 'page' : undefined}
                              className={cn(
                                'group relative flex w-full items-center gap-2 rounded-xl border border-transparent px-2 py-2 text-left transition-all hover:bg-muted/50',
                                isActive && ACTIVE_HIGHLIGHT,
                              )}
                            >
                              <div
                                className={cn(
                                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                  item.iconBg,
                                )}
                              >
                                <Icon size={15} strokeWidth={2.25} className={item.iconText} />
                              </div>
                              <span
                                className={cn(
                                  'min-w-0 flex-1 truncate text-[10px] font-semibold leading-tight',
                                  isActive
                                    ? 'text-foreground'
                                    : 'text-muted-foreground group-hover:text-foreground',
                                )}
                              >
                                {item.label}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Hana gets her own row: she is a companion, not a feature. */}
              <section className="px-0.5">
                <button
                  type="button"
                  onClick={() => navigateTo('hana')}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/50',
                    currentScreen === 'hana' && ACTIVE_HIGHLIGHT,
                  )}
                >
                  <span className="h-8 w-8 shrink-0">
                    <HanaFace mood="happy" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold text-foreground">Hana</span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      Ask about your home
                    </span>
                  </span>
                </button>
              </section>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-border p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateTo('profile')}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-1.5 text-foreground transition-all',
                  currentScreen === 'profile' ? 'bg-muted' : 'bg-muted/50 hover:bg-muted',
                )}
              >
                <div
                  className={cn(
                    'shrink-0 rounded-lg p-1 transition-all',
                    currentScreen === 'profile' ? 'bg-primary text-white' : 'text-foreground',
                  )}
                >
                  <User size={16} />
                </div>
                <span className="text-xs font-medium">Profile</span>
                {role === 'OBSERVER' && (
                  <span className="ml-auto shrink-0 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Observer
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigateTo('settings')}
                title="Settings"
                aria-label="Settings"
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all',
                  currentScreen === 'settings'
                    ? 'border-primary bg-primary text-white shadow-sm'
                    : 'border-border bg-muted/50 text-foreground hover:bg-muted hover:text-primary',
                )}
              >
                <Settings size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => void signOutUser()}
              className="flex w-full items-center gap-3 rounded-xl bg-destructive/10 px-4 py-2 text-destructive transition-all hover:bg-destructive hover:text-white"
            >
              <div className="rounded-lg p-1">
                <LogOut size={16} />
              </div>
              <span className="text-xs font-medium">Sign out</span>
            </button>
          </div>

          <div className="flex items-center gap-3 border-t border-border p-3">
            <button
              type="button"
              onClick={() => navigateTo('profile')}
              title="About Theria Household"
              aria-label="About Theria Household"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/80 text-primary shadow-sm transition-all hover:border-primary/40 hover:bg-primary hover:text-white"
            >
              <Info size={18} strokeWidth={2.25} />
            </button>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[10px] font-medium leading-tight text-foreground">
                Theria Household
              </p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                © {new Date().getFullYear()} All rights reserved
              </p>
            </div>
            <button
              type="button"
              onClick={toggleHana}
              title={hanaVisible ? 'Hide Hana' : 'Show Hana'}
              aria-label={hanaVisible ? 'Hide Hana' : 'Show Hana'}
              aria-pressed={hanaVisible}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-all',
                hanaVisible
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-muted/80 text-muted-foreground hover:border-primary/40 hover:text-primary',
              )}
            >
              <Sparkles size={16} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
