import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';

const KEY = 'themePreference';
let preferenceCache: ThemePreference | null = null;

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export async function loadThemePreference(): Promise<ThemePreference> {
  if (preferenceCache) return preferenceCache;
  const stored = await AsyncStorage.getItem(KEY);
  preferenceCache = isThemePreference(stored) ? stored : 'system';
  return preferenceCache;
}

export async function saveThemePreference(preference: ThemePreference) {
  preferenceCache = preference;
  await AsyncStorage.setItem(KEY, preference);
}
