import React, { Suspense, useEffect } from 'react';
import { motion } from 'motion/react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../core/state/AuthContext';
import { useHousehold } from '../../core/state/HouseholdContext';
import { AuthScreen } from '../../features/auth/screens/AuthScreen';
import { CreateHouseholdScreen } from '../../features/household/screens/CreateHouseholdScreen';
import { HanaFloat } from '../../features/hana/HanaFloat';
import { FloatingActionButton } from '../../shared/components/FloatingActionButton';
import { LoadingState } from '../../shared/components/LoadingState';
import { Sidebar } from '../../shared/components/Sidebar';
import { SCROLL_LOCK_SCREENS, pathFor, screenFromPath, type Screen } from '../routes';
import { UiProvider } from '../state/UiContext';
import { useUi, type ModalName } from '../state/uiStore';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

/**
 * On a feature screen the FAB collapses to that screen's single add action —
 * offering four choices when three of them navigate away is a menu pretending
 * to be a shortcut.
 */
const FAB_DIRECT_ACTIONS: Partial<Record<Screen, { label: string; modal: ModalName; buttonClass: string }>> = {
  stock: { label: 'Add Stock', modal: 'stock', buttonClass: 'bg-emerald-600 hover:bg-emerald-700' },
  bills: { label: 'Add Bill', modal: 'bill', buttonClass: 'bg-amber-600 hover:bg-amber-700' },
  deadlines: { label: 'Add Deadline', modal: 'deadline', buttonClass: 'bg-sky-600 hover:bg-sky-700' },
  tasks: { label: 'Add Task', modal: 'task', buttonClass: 'bg-violet-600 hover:bg-violet-700' },
};

/** Screens where floating chrome would sit on top of the thing you came for. */
const NO_FLOATING_CHROME: readonly Screen[] = ['hana'];

const ShellChrome: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const screen = screenFromPath(pathname);

  const { can } = useHousehold();
  const { sidebarOpen, setSidebarOpen, fabOpen, setFabOpen, openAdd } = useUi();

  // Close the quick-actions menu on navigation, so it is never left open behind
  // a screen where the FAB is a single direct action.
  useEffect(() => {
    setFabOpen(false);
  }, [pathname, setFabOpen]);

  const lockScroll = SCROLL_LOCK_SCREENS.includes(screen);
  const hideFloating = NO_FLOATING_CHROME.includes(screen);

  // An Observer gets no add button at all — nothing disabled, simply not offered.
  const canAdd = can('stock:write') || can('deadlines:write');

  const direct = FAB_DIRECT_ACTIONS[screen];
  const directAction = direct
    ? { label: direct.label, onClick: () => openAdd(direct.modal), buttonClass: direct.buttonClass }
    : null;

  return (
    <div
      className={
        lockScroll
          ? 'relative flex h-dvh flex-col overflow-hidden'
          : 'app-page-background relative min-h-dvh pb-bottom-nav'
      }
    >
      <TopBar screen={screen} />

      <main
        className={
          lockScroll
            ? 'flex w-full min-h-0 flex-1 flex-col overflow-hidden px-4 py-6 pb-bottom-nav sm:px-6 lg:px-8'
            : 'w-full px-4 py-6 sm:px-6 lg:px-8'
        }
      >
        <div
          className={
            lockScroll
              ? 'mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col'
              : 'mx-auto max-w-7xl'
          }
        >
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={lockScroll ? 'flex min-h-0 flex-1 flex-col' : undefined}
          >
            <Suspense fallback={<LoadingState />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </div>
      </main>

      <BottomNav screen={screen} />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={(target) => navigate(pathFor(target as Screen))}
        currentScreen={screen}
      />

      {canAdd && !hideFloating && (
        <FloatingActionButton
          isOpen={fabOpen}
          onToggle={() => setFabOpen(!fabOpen)}
          onSelect={(modal) => {
            // The screen that owns the form is the one that can open it, so
            // navigate there and leave the request for it to pick up.
            const target: Record<ModalName, Screen> = {
              stock: 'stock',
              bill: 'bills',
              deadline: 'deadlines',
              task: 'tasks',
            };
            openAdd(modal);
            navigate(pathFor(target[modal]));
          }}
          directAction={directAction}
        />
      )}

      {/* Hana's bubble opens the conversation, so she steps aside once you are in it. */}
      {!hideFloating && <HanaFloat />}
    </div>
  );
};

/**
 * Layout route.
 *
 * Sign-in and household creation are stateful gates rather than locations, so
 * they sit in front of the routed screens as they do in Finance.
 */
export const AppShell: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { phase } = useHousehold();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <LoadingState label="Checking your session" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  if (phase === 'no-household') return <CreateHouseholdScreen />;

  return (
    <UiProvider>
      <ShellChrome />
    </UiProvider>
  );
};
