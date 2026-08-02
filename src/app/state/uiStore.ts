import { createContext, useContext } from 'react';

/**
 * The UI context object and its hook, kept apart from the provider component.
 *
 * Splitting them is not tidiness: a file that exports both a component and a
 * hook defeats React Fast Refresh, which then hands out two module instances
 * and two distinct contexts — the consumer reads one the provider never filled.
 * See the same split on the auth and household contexts.
 */

/** Every quick-add the FAB can launch. */
export type ModalName = 'stock' | 'bill' | 'deadline' | 'task';

export type HanaSide = 'left' | 'right';

export interface UiContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  fabOpen: boolean;
  setFabOpen: (open: boolean) => void;

  /** Which quick-add a screen should open, cleared once handled. */
  pendingAdd: ModalName | null;
  openAdd: (modal: ModalName) => void;
  clearAdd: () => void;

  hanaVisible: boolean;
  toggleHana: () => void;
  hanaSide: HanaSide;
  setHanaSide: (side: HanaSide) => void;
}

export const UiContext = createContext<UiContextValue | null>(null);

export function useUi(): UiContextValue {
  const context = useContext(UiContext);
  if (!context) throw new Error('useUi must be used inside UiProvider');
  return context;
}
