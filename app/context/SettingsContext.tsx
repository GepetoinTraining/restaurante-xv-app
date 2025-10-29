// PATH: app/context/SettingsContext.tsx
"use client";

import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { MantineThemeOverride } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { compactTheme, comfortableTheme, accessibleTheme } from '../../lib/themes';

type ThemeProfile = 'compact' | 'comfortable' | 'accessible';

interface SettingsContextType {
  themeProfile: ThemeProfile;
  setThemeProfile: (profile: ThemeProfile) => void;
  activeTheme: MantineThemeOverride;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const themeMap: Record<ThemeProfile, MantineThemeOverride> = {
  compact: compactTheme,
  comfortable: comfortableTheme,
  accessible: accessibleTheme,
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [themeProfile, setThemeProfile] = useLocalStorage<ThemeProfile>({
    key: 'user-theme-profile',
    defaultValue: 'comfortable',
  });

  // This ensures the correct theme object is passed to Mantine
  const activeTheme = useMemo(() => {
    return themeMap[themeProfile] || comfortableTheme;
  }, [themeProfile]);

  return (
    <SettingsContext.Provider 
      value={{ themeProfile, setThemeProfile, activeTheme }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}