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
const BillsScreen = lazy(() =>
  import('../features/bills/screens/BillsScreen').then((m) => ({ default: m.BillsScreen })),
);
const DeadlinesScreen = lazy(() =>
  import('../features/deadlines/screens/DeadlinesScreen').then((m) => ({
    default: m.DeadlinesScreen,
  })),
);
const TasksScreen = lazy(() =>
  import('../features/tasks/screens/TasksScreen').then((m) => ({ default: m.TasksScreen })),
);
const AnalysisScreen = lazy(() =>
  import('../features/analysis/screens/AnalysisScreen').then((m) => ({
    default: m.AnalysisScreen,
  })),
);
const HanaScreen = lazy(() =>
  import('../features/hana/screens/HanaScreen').then((m) => ({ default: m.HanaScreen })),
);
const SettingsScreen = lazy(() =>
  import('../features/settings/screens/SettingsScreen').then((m) => ({
    default: m.SettingsScreen,
  })),
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
      { path: 'bills', element: <BillsScreen /> },
      { path: 'deadlines', element: <DeadlinesScreen /> },
      { path: 'tasks', element: <TasksScreen /> },
      { path: 'analysis', element: <AnalysisScreen /> },
      { path: 'hana', element: <HanaScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
      { path: 'profile', element: <PlaceholderScreen screen="profile" /> },
      { path: 'notifications', element: <PlaceholderScreen screen="notifications" /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
