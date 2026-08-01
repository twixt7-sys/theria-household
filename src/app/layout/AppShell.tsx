import React, { Suspense } from 'react';
import { motion } from 'motion/react';
import { Outlet, useLocation } from 'react-router';
import { useAuth } from '../../core/state/AuthContext';
import { useHousehold } from '../../core/state/HouseholdContext';
import { AuthScreen } from '../../features/auth/screens/AuthScreen';
import { CreateHouseholdScreen } from '../../features/household/screens/CreateHouseholdScreen';
import { LoadingState } from '../../shared/components/LoadingState';
import { SCROLL_LOCK_SCREENS, screenFromPath } from '../routes';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

/**
 * Layout route.
 *
 * Sign-in and household creation are stateful gates rather than locations, so
 * they sit in front of the routed screens as they do in Finance. Auth resolves
 * before any protected UI renders — no flash of a dashboard the user may not
 * be allowed to see.
 */
export const AppShell: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { phase } = useHousehold();
  const { pathname } = useLocation();
  const screen = screenFromPath(pathname);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <LoadingState label="Checking your session" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  if (phase === 'no-household') return <CreateHouseholdScreen />;

  const lockScroll = SCROLL_LOCK_SCREENS.includes(screen);

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
    </div>
  );
};
