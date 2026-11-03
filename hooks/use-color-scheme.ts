import { useThemePreference } from '@/components/providers/theme-preference-provider';

/**
 * Resolves light/dark from the user's saved preference ('system' follows the
 * device). Every themed screen reads this hook, so the choice applies app-wide.
 */
export function useColorScheme() {
  return useThemePreference().colorScheme;
}
