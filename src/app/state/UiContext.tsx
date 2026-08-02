import React, { useCallback, useMemo, useState } from 'react';
import { UiContext, type HanaSide, type ModalName, type UiContextValue } from './uiStore';

/**
 * Chrome state: the sidebar, the FAB, which quick-add was requested, and where
 * Hana is docked.
 *
 * These live above the routed screens because more than one piece of chrome
 * needs them at once — the top bar toggles the sidebar, the shell renders it,
 * and the FAB has to close itself on navigation. Mirrors Finance's UiContext.
 *
 * Only the provider lives here; the context and hook are in `uiStore.ts` so
 * Fast Refresh keeps working.
 */
export const UiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<ModalName | null>(null);
  const [hanaVisible, setHanaVisible] = useState(true);
  const [hanaSide, setHanaSide] = useState<HanaSide>('left');

  const openAdd = useCallback((modal: ModalName) => {
    setFabOpen(false);
    setPendingAdd(modal);
  }, []);

  const clearAdd = useCallback(() => setPendingAdd(null), []);
  const toggleHana = useCallback(() => setHanaVisible((v) => !v), []);

  const value = useMemo<UiContextValue>(
    () => ({
      sidebarOpen,
      setSidebarOpen,
      fabOpen,
      setFabOpen,
      pendingAdd,
      openAdd,
      clearAdd,
      hanaVisible,
      toggleHana,
      hanaSide,
      setHanaSide,
    }),
    [sidebarOpen, fabOpen, pendingAdd, openAdd, clearAdd, hanaVisible, toggleHana, hanaSide],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
};
