import { lazy } from 'react';
import { Navigate, createBrowserRouter } from 'react-router';
import { AppShell } from './layout/AppShell';
import { DashboardScreen } from './screens/DashboardScreen';

/**
 * Each screen is its own chunk, so a route downloads only what it renders.
 * The dashboard is eager — it is the landing route and the one that has to
 * feel instant.
 */
const StockScreen = lazy(() =>
  import('../features/stock/screens/StockScreen').then((m) => ({ default: m.StockScreen })),
);
const PlaceholderScreen = lazy(() =>
  import('./screens/PlaceholderScreen').then((m) => ({ default: m.PlaceholderScreen })),
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardScreen /> },
      { path: 'stock', element: <StockScreen /> },
      { path: 'deadlines', element: <PlaceholderScreen screen="deadlines" /> },
      { path: 'analysis', element: <PlaceholderScreen screen="analysis" /> },
      { path: 'homi', element: <PlaceholderScreen screen="homi" /> },
      { path: 'bills', element: <PlaceholderScreen screen="bills" /> },
      { path: 'settings', element: <PlaceholderScreen screen="settings" /> },
      { path: 'profile', element: <PlaceholderScreen screen="profile" /> },
      { path: 'notifications', element: <PlaceholderScreen screen="notifications" /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
