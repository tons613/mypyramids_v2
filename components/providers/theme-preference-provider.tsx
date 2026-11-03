import { loadThemePreference, saveThemePreference, ThemePreference } from '@/constants/theme-preference';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ResolvedColorScheme = 'light' | 'dark';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  colorScheme: ResolvedColorScheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let cancelled = false;
    loadThemePreference().then((stored) => {
      if (!cancelled) setPreferenceState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void saveThemePreference(next);
  }, []);

  const colorScheme: ResolvedColorScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(
    () => ({ preference, colorScheme, setPreference }),
    [preference, colorScheme, setPreference],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>
  );
}

/**
 * Reads the user's theme preference. Falls back to the device scheme when used
 * outside the provider, so screens stay usable in isolation (e.g. tests).
 */
export function useThemePreference(): ThemePreferenceContextValue {
  const context = useContext(ThemePreferenceContext);
  const systemScheme = useSystemColorScheme();
  const fallback = useMemo<ThemePreferenceContextValue>(
    () => ({
      preference: 'system',
      colorScheme: systemScheme === 'dark' ? 'dark' : 'light',
      setPreference: () => {},
    }),
    [systemScheme],
  );
  return context ?? fallback;
}
