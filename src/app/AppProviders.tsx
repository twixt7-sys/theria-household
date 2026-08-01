import React from 'react';
import { AuthProvider } from '../core/state/AuthContext';
import { HouseholdProvider } from '../core/state/HouseholdContext';

/**
 * Provider order matters: HouseholdProvider resolves membership from the
 * signed-in user, so it must sit inside AuthProvider.
 */
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <HouseholdProvider>{children}</HouseholdProvider>
  </AuthProvider>
);
